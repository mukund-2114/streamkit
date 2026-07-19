import { useState } from "react";
import { useAppSelector } from "./store/hooks";
import HlsPanel from "./components/HlsPanel";
import WebRTCPanel from "./components/WebRTCPanel";
import SessionPanel from "./components/SessionPanel";
import JoinPanel from "./components/JoinPanel";

type Tab = "hls" | "webrtc";

export default function App() {
  const [tab, setTab] = useState<Tab>("webrtc");
  const hasJoined = useAppSelector((s) => s.session.hasJoined);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>StreamKit</h1>
        <p>
          Browser-based video toolkit — WebRTC peer-to-peer streaming, HLS adaptive playback,
          WebCodecs frame capture, and multi-user PTZ session management.
        </p>
      </header>

      <nav className="tabs">
        <button className={tab === "webrtc" ? "active" : ""} onClick={() => setTab("webrtc")}>
          Live (WebRTC)
        </button>
        <button className={tab === "hls" ? "active" : ""} onClick={() => setTab("hls")}>
          Recorded (HLS)
        </button>
      </nav>

      <main className="app-main">
        <div className="main-column">
          {tab === "hls" ? (
            <HlsPanel />
          ) : hasJoined ? (
            <WebRTCPanel />
          ) : (
            <JoinPanel />
          )}
        </div>
        {tab === "webrtc" && hasJoined && (
          <aside className="side-column">
            <SessionPanel />
          </aside>
        )}
      </main>
    </div>
  );
}
