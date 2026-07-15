import { useAppSelector } from "../store/hooks";

export default function SessionPanel() {
  const { clientId, sessionId, participants, controllerId, connectionStatus } = useAppSelector((s) => s.session);

  return (
    <div className="session-panel">
      <h3>Session: {sessionId}</h3>
      <p className="panel-sub">
        Open this app in a second tab to see spectator mode in action — the first tab to join becomes controller.
      </p>
      <ul className="participant-list">
        {participants.length === 0 && connectionStatus !== "connected" && <li className="muted">Connecting…</li>}
        {participants.map((p) => (
          <li key={p.clientId} className={p.clientId === clientId ? "self" : ""}>
            <span className={`role-badge role-${p.role}`}>{p.role}</span>
            {p.displayName}
            {p.clientId === controllerId && " 👑"}
            {p.clientId === clientId && " (you)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
