import { useState } from "react";
import { useAppDispatch } from "../store/hooks";
import { joinSession } from "../store/sessionSlice";

export default function JoinPanel() {
  const [name, setName] = useState("");
  const dispatch = useAppDispatch();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      dispatch(joinSession(name.trim()));
    }
  };

  return (
    <section className="panel join-panel">
      <div className="panel-header">
        <h2>Join Live Session</h2>
      </div>
      <div className="join-body" style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
          Please enter your name to join the WebRTC session.
        </p>
        <form onSubmit={handleJoin} style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <input
            type="text"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ 
              padding: "0.75rem 1rem", 
              borderRadius: "6px", 
              border: "1px solid var(--border)",
              background: "var(--surface-sunken)",
              color: "var(--text-primary)",
              fontSize: "1rem"
            }}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!name.trim()} 
            style={{ 
              padding: "0.75rem 1.5rem",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: name.trim() ? "pointer" : "not-allowed",
              opacity: name.trim() ? 1 : 0.5,
              fontSize: "1rem",
              fontWeight: 500
            }}
          >
            Join Room
          </button>
        </form>
      </div>
    </section>
  );
}
