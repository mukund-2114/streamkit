# StreamKit

A full-stack browser-based video toolkit built with React and TypeScript. StreamKit covers real-world streaming patterns: WebRTC peer-to-peer video, HLS adaptive bitrate playback, WebCodecs frame capture, PTZ camera controls, and multi-user session management — all backed by a lightweight Node.js signaling server.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Redux Toolkit, Vite |
| Streaming | WebRTC (`RTCPeerConnection`), HLS (`hls.js`), WebCodecs API |
| Backend | Node.js, TypeScript, Express, `ws` (WebSocket) |

## Features

- **Live peer-to-peer video** — real `getUserMedia` + `RTCPeerConnection` negotiated through the signaling server
- **Multi-user sessions** — first visitor becomes the controller; everyone else joins as a read-only spectator via the same URL
- **HLS adaptive-bitrate playback** — `hls.js` stream with a scrubbable, color-coded recording timeline
- **PTZ camera controls** — pan, tilt, zoom controls gated by session role and synced to all peers in real time
- **WebCodecs frame snapshot** — full encode → decode round trip via `VideoEncoder`/`VideoDecoder` with canvas fallback
- **Redux Toolkit state** — typed slices for player, PTZ, and session state

## Deployment (Render)

The server serves both the WebSocket signaling and the built client files from a single port — one service, one URL, no extra config.

### Steps

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub account and select this repo
4. Render auto-detects `render.yaml` and fills in the settings:
   - **Build command:** `npm run build`
   - **Start command:** `npm run start`
5. Click **Deploy** — Render gives you a URL like `https://streamkit.onrender.com`

Anyone who visits that URL joins the same session automatically — first visitor becomes **controller**, everyone after is a **spectator**. No configuration needed.

> **Free tier note:** Render's free tier spins the server down after 15 minutes of inactivity. The first visit after a period of inactivity may take ~30 seconds to cold-start. Upgrading to the $7/mo plan keeps it always-on.

## Running locally

Two terminals:

```bash
# Terminal 1 — signaling server
cd server
npm install
npm run dev        # ws://localhost:8080

# Terminal 2 — Vite dev server
cd client
npm install
npm run dev        # http://localhost:5173
```

Open `http://localhost:5173` in two browser tabs: the first tab becomes the **controller**, the second joins as a **spectator**.

> **Browser support:** The WebCodecs snapshot feature requires a Chromium-based browser. Safari falls back to plain canvas capture automatically.

## Project structure

```
streamkit/
├── package.json            # Root build + start scripts (used by Render)
├── render.yaml             # Render deployment config
├── client/
│   └── src/
│       ├── components/
│       │   ├── HlsPanel.tsx        # HLS playback panel
│       │   ├── HlsPlayer.tsx       # hls.js video element
│       │   ├── WebRTCPanel.tsx     # Live WebRTC panel
│       │   ├── PTZControls.tsx     # Pan/tilt/zoom controls
│       │   ├── SessionPanel.tsx    # Participant list + roles
│       │   ├── SnapshotButton.tsx  # WebCodecs frame capture
│       │   └── Timeline.tsx        # Color-coded recording timeline
│       ├── hooks/
│       │   └── useWebRTC.ts        # WebSocket + RTCPeerConnection lifecycle
│       ├── lib/
│       │   └── webcodecsSnapshot.ts
│       └── store/
│           ├── playerSlice.ts
│           ├── ptzSlice.ts
│           ├── sessionSlice.ts
│           └── store.ts
└── server/
    └── src/
        ├── server.ts               # Express + WebSocket signaling server
        └── types.ts
```

## Known limitations

- Single hardcoded session room — no room creation UI.
- PTZ pan/tilt is simulated via CSS transform; no real camera hardware required.
- Server state is in-memory — restarting drops all active sessions.
- STUN-only ICE config; WebRTC may fail across strict NATs (works fine on same machine or LAN).

## License

MIT
