import { useRef, useState, useEffect, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { useAppSelector } from "../store/hooks";
import PTZControls from "./PTZControls";

const MicOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);

const MicOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);

const CamOnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);

const CamOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M7 7H1v10a2 2 0 0 0 2 2h14"/>
    <path d="M9.5 5H16a2 2 0 0 1 2 2v7.5"/>
    <polygon points="23 7 16 12 23 17 23 7"/>
  </svg>
);

const ExpandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>
);

const CompressIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

export default function WebRTCPanel() {
  const {
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
  } = useWebRTC();

  const typingTimeoutRef = useRef<number | null>(null);

  const session = useAppSelector((s) => s.session);
  const connectionStatus = session.connectionStatus;
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
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [chatInput, sendChatMessage, sendTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => sendTyping(false), 2000);
  };

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
              <span className="video-label">
                You {isAdmin ? "(admin)" : "(viewer)"}
              </span>
            </div>

            {Object.entries(remoteStreams).map(([id, stream]) => {
              const participant = session.participants.find(p => p.clientId === id);
              const displayName = participant ? participant.displayName : `Peer ${id.slice(-4)}`;
              const mediaState = remoteMediaStates[id] || { isVideoEnabled: true, isAudioEnabled: true };
              
              return (
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
                  {!mediaState.isVideoEnabled && <div className="video-off-overlay">Camera off</div>}
                  <span className="video-label">
                    {displayName}
                    {!mediaState.isAudioEnabled && " · muted"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="media-controls">
            <button
              className={`media-btn ${isAudioEnabled ? "media-btn--on" : "media-btn--off"}`}
              onClick={toggleAudio}
              title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {isAudioEnabled ? <MicOnIcon /> : <MicOffIcon />}
            </button>
            <button
              className={`media-btn ${isVideoEnabled ? "media-btn--on" : "media-btn--off"}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              aria-label={isVideoEnabled ? "Disable camera" : "Enable camera"}
            >
              {isVideoEnabled ? <CamOnIcon /> : <CamOffIcon />}
            </button>
            <button
              className="media-btn media-btn--on"
              onClick={handleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
            </button>
          </div>

          <PTZControls enabled={isAdmin} onMove={sendPtz} />
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
          <div className="typing-indicator" style={{ minHeight: "20px", padding: "0.25rem 1rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic", display: "flex", alignItems: "center" }}>
            {typingUsers.length > 0 && `${typingUsers.join(", ")} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Send a message…"
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              maxLength={300}
            />
            <button onClick={handleSend} disabled={!chatInput.trim()}>Send</button>
          </div>
        </div>
      </div>
    </section>
  );
}
