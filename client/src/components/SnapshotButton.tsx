import { useState } from "react";
import { captureSnapshot } from "../lib/webcodecsSnapshot";

interface SnapshotButtonProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export default function SnapshotButton({ videoRef }: SnapshotButtonProps) {
  const [snapshot, setSnapshot] = useState<{ dataUrl: string; usedWebCodecs: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("Video isn't ready yet — start playback first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await captureSnapshot(video);
      setSnapshot(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Snapshot failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="snapshot-block">
      <button onClick={handleClick} disabled={busy}>
        {busy ? "Capturing..." : "Take Snapshot"}
      </button>
      {error && <p className="error-text">{error}</p>}
      {snapshot && (
        <div className="snapshot-preview">
          <img src={snapshot.dataUrl} alt="Captured frame" />
          <div className="snapshot-meta">
            <span>{snapshot.usedWebCodecs ? "Encoded + decoded via WebCodecs" : "Canvas fallback (WebCodecs unsupported here)"}</span>
            <a href={snapshot.dataUrl} download="snapshot.png">
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
