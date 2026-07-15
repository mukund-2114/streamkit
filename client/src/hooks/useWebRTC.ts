import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { connectionStatusChanged, sessionStateReceived } from "../store/sessionSlice";
import { ptzMoved } from "../store/ptzSlice";
import type { ClientMessage, ServerMessage } from "../types";

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const SIGNALING_URL = `${wsProtocol}//${window.location.host}/ws`;

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useWebRTC() {
  const dispatch = useAppDispatch();
  const clientId = useAppSelector((s) => s.session.clientId);
  const displayName = useAppSelector((s) => s.session.displayName);
  const sessionId = useAppSelector((s) => s.session.sessionId);
  const controllerId = useAppSelector((s) => s.session.controllerId);

  const socketRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [mediaError, setMediaError] = useState<string | null>(null);

  const isController = controllerId === clientId;

  const send = useCallback((message: ClientMessage) => {
    socketRef.current?.readyState === WebSocket.OPEN && socketRef.current.send(JSON.stringify(message));
  }, []);

  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoElRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteClientId: string) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          send({ type: "signal", sessionId, to: remoteClientId, from: clientId, data: { candidate: event.candidate } });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({ ...prev, [remoteClientId]: event.streams[0] }));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "closed" || pc.connectionState === "failed") {
          peersRef.current.delete(remoteClientId);
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[remoteClientId];
            return next;
          });
        }
      };

      peersRef.current.set(remoteClientId, pc);
      return pc;
    },
    [clientId, send, sessionId],
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      dispatch(connectionStatusChanged("connecting"));

      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (localVideoElRef.current) {
          localVideoElRef.current.srcObject = localStreamRef.current;
        }
      } catch (err) {
        setMediaError(err instanceof Error ? `Could not access camera: ${err.message}` : "Could not access camera.");
      }
      if (cancelled) return;

      const socket = new WebSocket(SIGNALING_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        dispatch(connectionStatusChanged("connected"));
        send({ type: "join", sessionId, clientId, displayName });
      };

      socket.onclose = () => dispatch(connectionStatusChanged("disconnected"));
      socket.onerror = () => dispatch(connectionStatusChanged("disconnected"));

      socket.onmessage = async (event) => {
        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case "session-state":
            dispatch(sessionStateReceived({ participants: message.participants, controllerId: message.controllerId }));
            break;

          case "peer-joined": {
            const pc = createPeerConnection(message.clientId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ type: "signal", sessionId, to: message.clientId, from: clientId, data: { sdp: offer } });
            break;
          }

          case "signal": {
            const data = message.data as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
            let pc = peersRef.current.get(message.from);

            if (data.sdp) {
              if (!pc) pc = createPeerConnection(message.from);
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              if (data.sdp.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                send({ type: "signal", sessionId, to: message.from, from: clientId, data: { sdp: answer } });
              }
            } else if (data.candidate && pc) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;
          }

          case "peer-left": {
            peersRef.current.get(message.clientId)?.close();
            peersRef.current.delete(message.clientId);
            setRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[message.clientId];
              return next;
            });
            break;
          }

          case "ptz":
            dispatch(ptzMoved({ pan: message.pan, tilt: message.tilt, zoom: message.zoom }));
            break;

          case "error":
            console.warn("Signaling error:", message.message);
            break;
        }
      };
    }

    start();

    return () => {
      cancelled = true;
      send({ type: "leave", sessionId, clientId });
      socketRef.current?.close();
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendPtz = useCallback(
    (pan: number, tilt: number, zoom: number) => {
      send({ type: "ptz", sessionId, from: clientId, pan, tilt, zoom });
    },
    [clientId, send, sessionId],
  );

  return {
    setLocalVideoEl,
    remoteStreams,
    mediaError,
    isController,
    sendPtz,
  };
}
