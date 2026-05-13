import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const GREEN = "#154734";
const ACCENT = "#5CBF8A";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Login fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0d1a12",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#111e14", border: "1px solid #1e3a24",
        borderRadius: 12, padding: "40px 36px", width: 340,
        boxShadow: "0 20px 60px rgba(0,0,0,.6)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, letterSpacing: 4,
            color: ACCENT, marginBottom: 4,
          }}>DEF LAB</div>
          <div style={{ color: "#5a7a60", fontSize: 12, letterSpacing: 2 }}>
            FOOTBALL ANALYTICS
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0a1a10", color: "#c8d8c0",
                border: "1px solid #1e3a24", borderRadius: 6,
                padding: "10px 14px", fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#0a1a10", color: "#c8d8c0",
                border: "1px solid #1e3a24", borderRadius: 6,
                padding: "10px 14px", fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              color: "#e05a5a", fontSize: 13, marginBottom: 16,
              textAlign: "center",
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "10px 0",
              background: ACCENT, color: GREEN,
              border: "none", borderRadius: 6,
              fontSize: 14, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              letterSpacing: 1,
            }}
          >
            {loading ? "…" : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
