export type Role = "admin" | "viewer";

export interface Participant {
  clientId: string;
  role: Role;
  displayName: string;
}

export type ClientMessage =
  | { type: "join"; sessionId: string; clientId: string; displayName: string }
  | { type: "signal"; sessionId: string; to: string; from: string; data: unknown }
  | { type: "ptz"; sessionId: string; from: string; pan: number; tilt: number; zoom: number }
  | { type: "transfer-admin"; sessionId: string; targetClientId: string }
  | { type: "leave"; sessionId: string; clientId: string };

export type ServerMessage =
  | { type: "session-state"; sessionId: string; participants: Participant[]; adminId: string | null }
  | { type: "peer-joined"; clientId: string }
  | { type: "peer-left"; clientId: string }
  | { type: "signal"; from: string; data: unknown }
  | { type: "ptz"; from: string; pan: number; tilt: number; zoom: number }
  | { type: "error"; message: string };

export type SegmentState = "recorded" | "live" | "motion" | "gap";

export interface TimelineSegment {
  startSeconds: number;
  endSeconds: number;
  state: SegmentState;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  imageUrl?: string;
  fromSelf: boolean;
  timestamp: number;
}

export type DataChannelMessage =
  | { type: "chat"; message: ChatMessage }
  | { type: "typing"; from: string; isTyping: boolean }
  | { type: "media-state"; from: string; isVideoEnabled: boolean; isAudioEnabled: boolean };

