import { useRef } from "react";
import HlsPlayer from "./HlsPlayer";
import Timeline from "./Timeline";
import SnapshotButton from "./SnapshotButton";
import { useAppSelector } from "../store/hooks";

export default function HlsPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlaying = useAppSelector((s) => s.player.isPlaying);

  return (
    <section className="panel">
      <h2>Recorded (HLS)</h2>
      <p className="panel-sub">
        Adaptive-bitrate playback via <code>hls.js</code> against a public test manifest. Scrub the timeline below to
        seek — segment colors are mock manifest metadata, not derived from the actual stream.
      </p>

      <HlsPlayer videoRef={videoRef} />
      <Timeline />

      <div className="controls-row">
        <button onClick={() => (isPlaying ? videoRef.current?.pause() : videoRef.current?.play())}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <SnapshotButton videoRef={videoRef} />
      </div>
    </section>
  );
}
