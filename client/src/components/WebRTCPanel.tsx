import { useRef } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { useAppSelector } from "../store/hooks";
import PTZControls from "./PTZControls";

export default function WebRTCPanel() {
  const { setLocalVideoEl, remoteStreams, mediaError, isController, sendPtz } = useWebRTC();
  const connectionStatus = useAppSelector((s) => s.session.connectionStatus);
  const { pan, tilt, zoom } = useAppSelector((s) => s.ptz);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const ptzStyle: React.CSSProperties = {
    transform: `scale(${zoom}) translate(${pan * 0.3}%, ${-tilt * 0.3}%)`,
    transformOrigin: "center",
    transition: "transform 0.15s ease",
  };

  return (
    <section className="panel">
      <h2>Live (WebRTC)</h2>
      <p className="panel-sub">
        Peer-to-peer video via <code>RTCPeerConnection</code>, signaled through the local Node/WebSocket server.
        Status: <span className={`status status-${connectionStatus}`}>{connectionStatus}</span>
      </p>

      {mediaError && <p className="error-text">{mediaError} (camera permission is required for this panel)</p>}

      <div className="video-grid">
        <div className="video-tile">
          <video ref={setLocalVideoEl} autoPlay muted playsInline className="video-el" style={ptzStyle} />
          <span className="video-label">You {isController ? "(controller)" : "(spectator)"}</span>
        </div>

        {Object.entries(remoteStreams).map(([id, stream]) => (
          <div className="video-tile" key={id}>
            <video
              ref={(el) => {
                remoteVideoRefs.current[id] = el;
                if (el && el.srcObject !== stream) {
                  el.srcObject = stream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              className="video-el"
              style={ptzStyle}
            />
            <span className="video-label">Peer {id}</span>
          </div>
        ))}
      </div>

      <PTZControls enabled={isController} onMove={sendPtz} />
    </section>
  );
}
