import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const Logo = () => (
  <img src="/icon.png" alt="DEF LAB" style={{ width: 80, height: 80, borderRadius: 18, display: "block" }} />
);

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

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#141414", color: "#e8e8e8",
    border: "1px solid #2a2a2a", borderRadius: 8,
    padding: "11px 14px", fontSize: 14,
    outline: "none", transition: "border-color .15s",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#111111",
        border: "1px solid #1e1e1e",
        borderRadius: 16, padding: "40px 36px",
        width: 340,
        boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
      }}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Logo />
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22, fontWeight: 800, letterSpacing: 6,
            color: "#ffffff", marginBottom: 4,
          }}>DEF LAB</div>
          <div style={{ color: "#4a4a4a", fontSize: 11, letterSpacing: 3, textTransform: "uppercase" }}>
            Football Analytics
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Benutzername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              color: "#f87171", fontSize: 13, marginBottom: 16,
              textAlign: "center", background: "rgba(239,68,68,0.08)",
              borderRadius: 6, padding: "8px 12px",
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "11px 0",
              background: loading ? "#1e1e1e" : "#ffffff",
              color: loading ? "#555" : "#000",
              border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 2, textTransform: "uppercase",
              transition: "background .15s, color .15s",
            }}
          >
            {loading ? "…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
