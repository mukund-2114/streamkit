import { useAppDispatch, useAppSelector } from "../store/hooks";
import { ptzNudged, ptzReset } from "../store/ptzSlice";

interface PTZControlsProps {
  enabled: boolean;
  onMove?: (pan: number, tilt: number, zoom: number) => void;
}

export default function PTZControls({ enabled, onMove }: PTZControlsProps) {
  const dispatch = useAppDispatch();
  const { pan, tilt, zoom } = useAppSelector((s) => s.ptz);

  function nudge(dPan: number, dTilt: number, dZoom: number) {
    dispatch(ptzNudged({ dPan, dTilt, dZoom }));
    const next = {
      pan: Math.min(100, Math.max(-100, pan + dPan)),
      tilt: Math.min(100, Math.max(-100, tilt + dTilt)),
      zoom: Math.min(3, Math.max(1, zoom + dZoom)),
    };
    onMove?.(next.pan, next.tilt, next.zoom);
  }

  return (
    <div className="ptz-controls">
      <div className="ptz-pad">
        <button disabled={!enabled} onClick={() => nudge(0, -10, 0)} aria-label="Tilt up">
          ▲
        </button>
        <div className="ptz-pad-row">
          <button disabled={!enabled} onClick={() => nudge(-10, 0, 0)} aria-label="Pan left">
            ◀
          </button>
          <button disabled={!enabled} onClick={() => dispatch(ptzReset())} aria-label="Reset position">
            ●
          </button>
          <button disabled={!enabled} onClick={() => nudge(10, 0, 0)} aria-label="Pan right">
            ▶
          </button>
        </div>
        <button disabled={!enabled} onClick={() => nudge(0, 10, 0)} aria-label="Tilt down">
          ▼
        </button>
      </div>

      <label className="zoom-slider">
        Zoom
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          disabled={!enabled}
          onChange={(e) => nudge(0, 0, Number(e.target.value) - zoom)}
        />
      </label>

      {!enabled && <p className="ptz-hint">Read-only: only the session controller can move the camera.</p>}
    </div>
  );
}
