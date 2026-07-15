import { configureStore } from "@reduxjs/toolkit";
import sessionReducer from "./sessionSlice";
import playerReducer from "./playerSlice";
import ptzReducer from "./ptzSlice";

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    player: playerReducer,
    ptz: ptzReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
