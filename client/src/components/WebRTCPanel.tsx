import { useRef, useState, useEffect, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { useAppSelector } from "../store/hooks";
import PTZControls from "./PTZControls";

export default function WebRTCPanel() {
  const {
    setLocalVideoEl,
    remoteStreams,
    mediaError,
    isController,
    sendPtz,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo,
    toggleAudio,
    chatMessages,
    sendChatMessage,
  } = useWebRTC();

  const connectionStatus = useAppSelector((s) => s.session.connectionStatus);
  const { pan, tilt, zoom } = useAppSelector((s) => s.ptz);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const panelRef = useRef<HTMLElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [chatInput, setChatInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ptzStyle: React.CSSProperties = {
    transform: `scale(${zoom}) translate(${pan * 0.3}%, ${-tilt * 0.3}%)`,
    transformOrigin: "center",
    transition: "transform 0.15s ease",
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      panelRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleSend = useCallback(() => {
    sendChatMessage(chatInput);
    setChatInput("");
  }, [chatInput, sendChatMessage]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="panel webrtc-panel" ref={panelRef}>
      <div className="panel-header">
        <h2>Live (WebRTC)</h2>
        <span className={`status status-badge status-${connectionStatus}`}>{connectionStatus}</span>
      </div>

      {mediaError && <p className="error-text">{mediaError}</p>}

      <div className="webrtc-body">
        <div className="webrtc-main">
          <div className="video-grid">
            <div className="video-tile">
              <video ref={setLocalVideoEl} autoPlay muted playsInline className="video-el" style={ptzStyle} />
              {!isVideoEnabled && (
                <div className="video-off-overlay">Camera off</div>
              )}
              <span className="video-label">
                You {isController ? "(controller)" : "(spectator)"}
                {!isAudioEnabled && " · muted"}
              </span>
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
                <span className="video-label">Peer {id.slice(-4)}</span>
              </div>
            ))}
          </div>

          <div className="media-controls">
            <button
              className={`media-btn ${isAudioEnabled ? "media-btn--on" : "media-btn--off"}`}
              onClick={toggleAudio}
              title={isAudioEnabled ? "Mute mic" : "Unmute mic"}
              aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {isAudioEnabled ? "🎤" : "🔇"}
            </button>
            <button
              className={`media-btn ${isVideoEnabled ? "media-btn--on" : "media-btn--off"}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              aria-label={isVideoEnabled ? "Disable camera" : "Enable camera"}
            >
              {isVideoEnabled ? "📷" : "📵"}
            </button>
            <button
              className="media-btn media-btn--on"
              onClick={handleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? "↙" : "↗"}
            </button>
          </div>

          <PTZControls enabled={isController} onMove={sendPtz} />
        </div>

        <div className="chat-panel">
          <div className="chat-header">Chat</div>
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <p className="chat-empty">No messages yet — say hello!</p>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-msg ${msg.fromSelf ? "chat-msg--self" : "chat-msg--other"}`}>
                {!msg.fromSelf && <span className="chat-from">{msg.from}</span>}
                <span className="chat-text">{msg.text}</span>
                <span className="chat-time">{formatTime(msg.timestamp)}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Send a message…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              maxLength={300}
            />
            <button onClick={handleSend} disabled={!chatInput.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
