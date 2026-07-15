import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, Participant, Role, ServerMessage } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

const app = express();
const clientDist = join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(join(clientDist, "index.html")));

const httpServer = createServer(app);

interface Connection {
  clientId: string;
  displayName: string;
  role: Role;
  socket: WebSocket;
}

const sessions = new Map<string, Map<string, Connection>>();

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcastSessionState(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const participants: Participant[] = [...session.values()].map((c) => ({
    clientId: c.clientId,
    role: c.role,
    displayName: c.displayName,
  }));
  const controller = participants.find((p) => p.role === "controller");

  const message: ServerMessage = {
    type: "session-state",
    sessionId,
    participants,
    controllerId: controller?.clientId ?? null,
  };

  for (const conn of session.values()) send(conn.socket, message);
}

function handleJoin(sessionId: string, clientId: string, displayName: string, socket: WebSocket) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = new Map();
    sessions.set(sessionId, session);
  }

  const role: Role = session.size === 0 ? "controller" : "spectator";
  session.set(clientId, { clientId, displayName, role, socket });

  for (const conn of session.values()) {
    if (conn.clientId !== clientId) {
      send(conn.socket, { type: "peer-joined", clientId });
    }
  }

  broadcastSessionState(sessionId);
}

function handleLeave(sessionId: string, clientId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const wasController = session.get(clientId)?.role === "controller";
  session.delete(clientId);

  if (session.size === 0) {
    sessions.delete(sessionId);
    return;
  }

  if (wasController) {
    const next = session.values().next().value as Connection | undefined;
    if (next) next.role = "controller";
  }

  for (const conn of session.values()) {
    send(conn.socket, { type: "peer-left", clientId });
  }
  broadcastSessionState(sessionId);
}

function handleSignal(sessionId: string, to: string, from: string, data: unknown) {
  const session = sessions.get(sessionId);
  const target = session?.get(to);
  if (target) send(target.socket, { type: "signal", from, data });
}

function handlePtz(sessionId: string, from: string, pan: number, tilt: number, zoom: number) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const sender = session.get(from);
  if (!sender || sender.role !== "controller") {
    if (sender) send(sender.socket, { type: "error", message: "Only the controller can send PTZ commands." });
    return;
  }

  for (const conn of session.values()) {
    if (conn.clientId !== from) send(conn.socket, { type: "ptz", from, pan, tilt, zoom });
  }
}

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (socket) => {
  let joined: { sessionId: string; clientId: string } | null = null;

  socket.on("message", (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: "error", message: "Malformed message" });
      return;
    }

    switch (message.type) {
      case "join":
        joined = { sessionId: message.sessionId, clientId: message.clientId };
        handleJoin(message.sessionId, message.clientId, message.displayName, socket);
        break;
      case "signal":
        handleSignal(message.sessionId, message.to, message.from, message.data);
        break;
      case "ptz":
        handlePtz(message.sessionId, message.from, message.pan, message.tilt, message.zoom);
        break;
      case "leave":
        handleLeave(message.sessionId, message.clientId);
        joined = null;
        break;
    }
  });

  socket.on("close", () => {
    if (joined) handleLeave(joined.sessionId, joined.clientId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`StreamKit listening on port ${PORT}`);
});
