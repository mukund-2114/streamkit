import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { connectionStatusChanged, sessionStateReceived } from "../store/sessionSlice";
import { ptzMoved } from "../store/ptzSlice";
import type { ClientMessage, ServerMessage, ChatMessage, DataChannelMessage } from "../types";

const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const SIGNALING_URL = `${wsProtocol}//${window.location.host}/ws`;

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const playJoinSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.warn("Could not play join sound:", err);
  }
};

export function useWebRTC() {
  const dispatch = useAppDispatch();
  const clientId = useAppSelector((s) => s.session.clientId);
  const displayName = useAppSelector((s) => s.session.displayName);
  const sessionId = useAppSelector((s) => s.session.sessionId);
  const adminId = useAppSelector((s) => s.session.adminId);

  const socketRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [remoteMediaStates, setRemoteMediaStates] = useState<Record<string, { isVideoEnabled: boolean; isAudioEnabled: boolean }>>({});

  const isVideoEnabledRef = useRef(true);
  const isAudioEnabledRef = useRef(true);

  const isAdmin = adminId === clientId;

  const send = useCallback((message: ClientMessage) => {
    socketRef.current?.readyState === WebSocket.OPEN && socketRef.current.send(JSON.stringify(message));
  }, []);

  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoElRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoEnabled((prev) => {
      const next = !prev;
      isVideoEnabledRef.current = next;
      const payload = JSON.stringify({ type: "media-state", from: clientId, isVideoEnabled: next, isAudioEnabled: isAudioEnabledRef.current });
      dataChannelsRef.current.forEach((dc) => { if (dc.readyState === "open") dc.send(payload); });
      return next;
    });
  }, [clientId]);

  const toggleAudio = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsAudioEnabled((prev) => {
      const next = !prev;
      isAudioEnabledRef.current = next;
      const payload = JSON.stringify({ type: "media-state", from: clientId, isVideoEnabled: isVideoEnabledRef.current, isAudioEnabled: next });
      dataChannelsRef.current.forEach((dc) => { if (dc.readyState === "open") dc.send(payload); });
      return next;
    });
  }, [clientId]);

  const setupDataChannel = useCallback((dc: RTCDataChannel, remoteClientId: string) => {
    dc.onopen = () => {
      dataChannelsRef.current.set(remoteClientId, dc);
      dc.send(JSON.stringify({ type: "media-state", from: clientId, isVideoEnabled: isVideoEnabledRef.current, isAudioEnabled: isAudioEnabledRef.current }));
    };
    dc.onclose = () => dataChannelsRef.current.delete(remoteClientId);
    dc.onmessage = (event) => {
      try {
        const data: DataChannelMessage = JSON.parse(event.data);
        if (data.type === "chat") {
          setChatMessages((prev) => [...prev, data.message]);
        } else if (data.type === "typing") {
          setTypingUsers((prev) => {
            if (data.isTyping) return prev.includes(data.from) ? prev : [...prev, data.from];
            return prev.filter((u) => u !== data.from);
          });
        } else if (data.type === "media-state") {
          setRemoteMediaStates((prev) => ({
            ...prev,
            [data.from]: { isVideoEnabled: data.isVideoEnabled, isAudioEnabled: data.isAudioEnabled },
          }));
        }
      } catch {
        // Fallback for old messages
        const msg: ChatMessage = JSON.parse(event.data);
        if (msg.text) setChatMessages((prev) => [...prev, msg]);
      }
    };
  }, []);

  const sendChatMessage = useCallback(
    (text: string, imageUrl?: string) => {
      if (!text.trim() && !imageUrl) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        from: displayName,
        text: text.trim(),
        imageUrl,
        fromSelf: true,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, msg]);
      const payload = JSON.stringify({ type: "chat", message: { ...msg, fromSelf: false } });
      dataChannelsRef.current.forEach((dc) => {
        if (dc.readyState === "open") dc.send(payload);
      });
    },
    [displayName],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const payload = JSON.stringify({ type: "typing", from: displayName, isTyping });
      dataChannelsRef.current.forEach((dc) => {
        if (dc.readyState === "open") dc.send(payload);
      });
    },
    [displayName]
  );

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

      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, remoteClientId);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "closed" || pc.connectionState === "failed") {
          peersRef.current.delete(remoteClientId);
          dataChannelsRef.current.delete(remoteClientId);
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
    [clientId, send, sessionId, setupDataChannel],
  );

  useEffect(() => {
    let cancelled = false;

    async function start() {
      dispatch(connectionStatusChanged("connecting"));

      try {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoElRef.current) {
          localVideoElRef.current.srcObject = localStreamRef.current;
          localVideoElRef.current.play().catch(() => {});
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
            dispatch(sessionStateReceived({ participants: message.participants, adminId: message.adminId }));
            break;

          case "peer-joined": {
            playJoinSound();
            const pc = createPeerConnection(message.clientId);
            const dc = pc.createDataChannel("chat");
            setupDataChannel(dc, message.clientId);
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
            dataChannelsRef.current.delete(message.clientId);
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
      dataChannelsRef.current.clear();
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

  const transferAdmin = useCallback((targetClientId: string) => {
    send({ type: "transfer-admin", sessionId, targetClientId });
  }, [send, sessionId]);

  const claimAdmin = useCallback((secret: string) => {
    send({ type: "claim-admin", sessionId, secret });
  }, [send, sessionId]);

  return {
    setLocalVideoEl,
    remoteStreams,
    mediaError,
    isAdmin,
    sendPtz,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    chatMessages,
    sendChatMessage,
    typingUsers,
    sendTyping,
    remoteMediaStates,
    transferAdmin,
    claimAdmin,
  };
}
