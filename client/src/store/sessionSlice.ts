import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Participant } from "../types";

interface SessionState {
  clientId: string;
  sessionId: string;
  displayName: string;
  hasJoined: boolean;
  connectionStatus: "idle" | "connecting" | "connected" | "disconnected";
  participants: Participant[];
  adminId: string | null;
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const initialState: SessionState = {
  clientId: randomId("client"),
  sessionId: "demo-room",
  displayName: "",
  hasJoined: false,
  connectionStatus: "idle",
  participants: [],
  adminId: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    connectionStatusChanged(state, action: PayloadAction<SessionState["connectionStatus"]>) {
      state.connectionStatus = action.payload;
    },
    sessionStateReceived(
      state,
      action: PayloadAction<{ participants: Participant[]; adminId: string | null }>,
    ) {
      state.participants = action.payload.participants;
      state.adminId = action.payload.adminId;
    },
    sessionIdChanged(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },
    joinSession(state, action: PayloadAction<string>) {
      state.displayName = action.payload;
      state.hasJoined = true;
    },
  },
});

export const { connectionStatusChanged, sessionStateReceived, sessionIdChanged, joinSession } = sessionSlice.actions;
export default sessionSlice.reducer;
