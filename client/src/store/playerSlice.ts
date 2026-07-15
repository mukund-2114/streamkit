import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TimelineSegment } from "../types";

const demoSegments: TimelineSegment[] = [
  { startSeconds: 0, endSeconds: 45, state: "recorded" },
  { startSeconds: 45, endSeconds: 60, state: "gap" },
  { startSeconds: 60, endSeconds: 120, state: "recorded" },
  { startSeconds: 120, endSeconds: 140, state: "motion" },
  { startSeconds: 140, endSeconds: 180, state: "recorded" },
];

export type PlaybackMode = "hls" | "webrtc";

interface PlayerState {
  mode: PlaybackMode;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  segments: TimelineSegment[];
}

const initialState: PlayerState = {
  mode: "hls",
  isPlaying: false,
  currentTime: 0,
  duration: 180,
  segments: demoSegments,
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    modeChanged(state, action: PayloadAction<PlaybackMode>) {
      state.mode = action.payload;
    },
    playingChanged(state, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
    timeUpdated(state, action: PayloadAction<{ currentTime: number; duration: number }>) {
      state.currentTime = action.payload.currentTime;
      if (Number.isFinite(action.payload.duration) && action.payload.duration > 0) {
        state.duration = action.payload.duration;
      }
    },
    seeked(state, action: PayloadAction<number>) {
      state.currentTime = action.payload;
    },
  },
});

export const { modeChanged, playingChanged, timeUpdated, seeked } = playerSlice.actions;
export default playerSlice.reducer;
