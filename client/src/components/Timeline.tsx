import { useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { seeked } from "../store/playerSlice";
import type { SegmentState } from "../types";

const STATE_COLORS: Record<SegmentState, string> = {
  recorded: "#2e5b8a",
  live: "#3fae5c",
  motion: "#c0392b",
  gap: "#5a5a5a",
};

const STATE_LABELS: Record<SegmentState, string> = {
  recorded: "Recorded",
  live: "Live",
  motion: "Motion event",
  gap: "No coverage",
};

export default function Timeline() {
  const dispatch = useAppDispatch();
  const { segments, duration, currentTime } = useAppSelector((s) => s.player);
  const trackRef = useRef<HTMLDivElement>(null);

  function handleScrub(clientX: number) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    dispatch(seeked(ratio * duration));
  }

  return (
    <div className="timeline">
      <div
        className="timeline-track"
        ref={trackRef}
        onClick={(e) => handleScrub(e.clientX)}
        role="slider"
        aria-label="Recording timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") dispatch(seeked(Math.min(duration, currentTime + 5)));
          if (e.key === "ArrowLeft") dispatch(seeked(Math.max(0, currentTime - 5)));
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className="timeline-segment"
            title={`${STATE_LABELS[seg.state]}: ${seg.startSeconds}s - ${seg.endSeconds}s`}
            style={{
              left: `${(seg.startSeconds / duration) * 100}%`,
              width: `${((seg.endSeconds - seg.startSeconds) / duration) * 100}%`,
              backgroundColor: STATE_COLORS[seg.state],
            }}
          />
        ))}
        <div className="timeline-playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
      </div>

      <div className="timeline-legend">
        {(Object.keys(STATE_LABELS) as SegmentState[]).map((state) => (
          <span key={state} className="legend-item">
            <span className="legend-swatch" style={{ backgroundColor: STATE_COLORS[state] }} />
            {STATE_LABELS[state]}
          </span>
        ))}
      </div>
    </div>
  );
}
