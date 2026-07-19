import { useRef, useState, useEffect, useCallback } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { ptzNudged, ptzReset } from "../store/ptzSlice";
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

const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scale = MAX_WIDTH / Math.max(img.width, 1);
        canvas.width = img.width * Math.min(1, scale);
        canvas.height = img.height * Math.min(1, scale);
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
    transferAdmin,
  } = useWebRTC();

  const typingTimeoutRef = useRef<number | null>(null);

  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session);
  const connectionStatus = session.connectionStatus;
  const { pan, tilt, zoom } = useAppSelector((s) => s.ptz);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const panelRef = useRef<HTMLElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const touchState = useRef({
    initialDistance: 0,
    initialZoom: 1,
    lastX: 0,
    lastY: 0,
    isPanning: false
  });
  const ptzRef = useRef({ pan, tilt, zoom });
  const lastTapRef = useRef(0);
  
  useEffect(() => {
    ptzRef.current = { pan, tilt, zoom };
  }, [pan, tilt, zoom]);

  const handleDoubleClick = () => {
    if (!isAdmin) return;
    dispatch(ptzReset());
    sendPtz(0, 0, 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAdmin) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState.current.initialDistance = Math.hypot(dx, dy);
      touchState.current.initialZoom = ptzRef.current.zoom;
      touchState.current.isPanning = false;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleClick();
      }
      lastTapRef.current = now;
      touchState.current.lastX = e.touches[0].clientX;
      touchState.current.lastY = e.touches[0].clientY;
      touchState.current.isPanning = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAdmin) return;
    
    if (e.touches.length === 2 && touchState.current.initialDistance > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const deltaZoom = (dist - touchState.current.initialDistance) * 0.01;
      
      const targetZoom = Math.min(3, Math.max(1, touchState.current.initialZoom + deltaZoom));
      const currentZoom = ptzRef.current.zoom;
      const dZoom = targetZoom - currentZoom;
      
      if (Math.abs(dZoom) > 0.02) {
        dispatch(ptzNudged({ dPan: 0, dTilt: 0, dZoom }));
        sendPtz(ptzRef.current.pan, ptzRef.current.tilt, targetZoom);
      }
    } else if (e.touches.length === 1 && touchState.current.isPanning) {
      const dx = e.touches[0].clientX - touchState.current.lastX;
      const dy = e.touches[0].clientY - touchState.current.lastY;
      
      const targetPan = Math.min(100, Math.max(-100, ptzRef.current.pan + dx * 0.5));
      const targetTilt = Math.min(100, Math.max(-100, ptzRef.current.tilt - dy * 0.5));
      
      const dPan = targetPan - ptzRef.current.pan;
      const dTilt = targetTilt - ptzRef.current.tilt;
      
      if (Math.abs(dPan) > 1 || Math.abs(dTilt) > 1) {
        dispatch(ptzNudged({ dPan, dTilt, dZoom: 0 }));
        sendPtz(targetPan, targetTilt, ptzRef.current.zoom);
        touchState.current.lastX = e.touches[0].clientX;
        touchState.current.lastY = e.touches[0].clientY;
      }
    }
  };
  
  const handleTouchEnd = () => {
    touchState.current.isPanning = false;
    touchState.current.initialDistance = 0;
  };

  const [chatInput, setChatInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    const handleVisibilityChange = () => {
      const isHidden = document.visibilityState === "hidden";
      Object.values(remoteVideoRefs.current).forEach((videoEl) => {
        if (videoEl) {
          videoEl.muted = isHidden;
        }
      });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [chatInput, sendChatMessage, sendTyping]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      sendChatMessage("", dataUrl);
    } catch (err) {
      console.error("Failed to compress image", err);
    }
    e.target.value = "";
  };

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

      <div className="webrtc-body" style={!isChatOpen ? { gridTemplateColumns: "1fr" } : {}}>
        <div className="webrtc-main">
          <div 
            className="video-grid"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            style={{ touchAction: isAdmin ? 'none' : 'auto' }}
          >
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
                  {!mediaState.isVideoEnabled && (
                    <div className="video-off-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '0.5rem' }}>
                        <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                      Camera off
                    </div>
                  )}
                  {isAdmin && (
                    <button 
                      className="make-admin-btn"
                      onClick={() => transferAdmin(id)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: '1px solid #3fae5c', color: '#3fae5c', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', zIndex: 10 }}
                    >
                      Make Admin
                    </button>
                  )}
                  <span className="video-label" style={{ display: 'flex', alignItems: 'center' }}>
                    {displayName}
                    {!mediaState.isAudioEnabled && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px', color: '#ff4444' }}>
                        <title>Muted</title>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                      </svg>
                    )}
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
              className={`media-btn ${isChatOpen ? "media-btn--on" : "media-btn--off"}`}
              style={!isChatOpen ? { background: '#2a3347', color: 'var(--text)' } : {}}
              onClick={() => setIsChatOpen(!isChatOpen)}
              title={isChatOpen ? "Close chat" : "Open chat"}
              aria-label="Toggle chat"
            >
              <ChatIcon />
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

        {isChatOpen && (
          <div className="chat-panel">
            <div className="chat-header">Chat</div>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <p className="chat-empty">No messages yet — say hello!</p>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-msg ${msg.fromSelf ? "chat-msg--self" : "chat-msg--other"}`}>
                  {!msg.fromSelf && <span className="chat-from">{msg.from}</span>}
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="chat attachment" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }} />
                  )}
                  {msg.text && <span className="chat-text">{msg.text}</span>}
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
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                title="Send Image"
                aria-label="Send Image"
              >
                <ImageIcon />
              </button>
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
        )}
      </div>
    </section>
  );
}
