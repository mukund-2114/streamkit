import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Participant } from "../types";

interface SessionState {
  clientId: string;
  sessionId: string;
  displayName: string;
  connectionStatus: "idle" | "connecting" | "connected" | "disconnected";
  participants: Participant[];
  controllerId: string | null;
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const initialState: SessionState = {
  clientId: randomId("client"),
  sessionId: "demo-room",
  displayName: randomId("viewer"),
  connectionStatus: "idle",
  participants: [],
  controllerId: null,
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
      action: PayloadAction<{ participants: Participant[]; controllerId: string | null }>,
    ) {
      state.participants = action.payload.participants;
      state.controllerId = action.payload.controllerId;
    },
    sessionIdChanged(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },
  },
});

export const { connectionStatusChanged, sessionStateReceived, sessionIdChanged } = sessionSlice.actions;
export default sessionSlice.reducer;
