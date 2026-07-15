import { useState } from "react";
import HlsPanel from "./components/HlsPanel";
import WebRTCPanel from "./components/WebRTCPanel";
import SessionPanel from "./components/SessionPanel";

type Tab = "hls" | "webrtc";

export default function App() {
  const [tab, setTab] = useState<Tab>("hls");

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
        <button className={tab === "hls" ? "active" : ""} onClick={() => setTab("hls")}>
          Recorded (HLS)
        </button>
        <button className={tab === "webrtc" ? "active" : ""} onClick={() => setTab("webrtc")}>
          Live (WebRTC)
        </button>
      </nav>

      <main className="app-main">
        <div className="main-column">{tab === "hls" ? <HlsPanel /> : <WebRTCPanel />}</div>
        {tab === "webrtc" && (
          <aside className="side-column">
            <SessionPanel />
          </aside>
        )}
      </main>
    </div>
  );
}
