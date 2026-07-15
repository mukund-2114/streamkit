import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface PtzState {
  pan: number;
  tilt: number;
  zoom: number;
}

const initialState: PtzState = {
  pan: 0,
  tilt: 0,
  zoom: 1,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ptzSlice = createSlice({
  name: "ptz",
  initialState,
  reducers: {
    ptzMoved(state, action: PayloadAction<{ pan: number; tilt: number; zoom: number }>) {
      state.pan = clamp(action.payload.pan, -100, 100);
      state.tilt = clamp(action.payload.tilt, -100, 100);
      state.zoom = clamp(action.payload.zoom, 1, 3);
    },
    ptzNudged(state, action: PayloadAction<{ dPan: number; dTilt: number; dZoom: number }>) {
      state.pan = clamp(state.pan + action.payload.dPan, -100, 100);
      state.tilt = clamp(state.tilt + action.payload.dTilt, -100, 100);
      state.zoom = clamp(state.zoom + action.payload.dZoom, 1, 3);
    },
    ptzReset(state) {
      state.pan = 0;
      state.tilt = 0;
      state.zoom = 1;
    },
  },
});

export const { ptzMoved, ptzNudged, ptzReset } = ptzSlice.actions;
export default ptzSlice.reducer;
