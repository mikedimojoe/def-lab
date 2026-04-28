import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const GREEN = "#154734";
const ACCENT = "#5CBF8A";

export default function Login() {
  const { login }         = useAuth();
  const navigate          = useNavigate();
  const [username, setU]  = useState("");
  const [password, setP]  = useState("");
  const [error, setError] = useState("");
  const [loading, setL]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setL(true);
    try {
      await login(username, password);
      navigate("/overview");
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen");
    } finally {
      setL(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 12,
        padding: "48px 40px",
        width: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,.6)",
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: GREEN,
            borderRadius: "50%",
            margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>🦄</div>
          <h1 style={{ color: "#eee", fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: 1 }}>
            DEF LAB
          </h1>
          <p style={{ color: "#555", fontSize: 13, margin: "6px 0 0" }}>
            Schwäbisch Hall Unicorns
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>
              Benutzername
            </label>
            <input
              value={username}
              onChange={e => setU(e.target.value)}
              autoFocus
              placeholder="Username"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", color: "#888", fontSize: 12, marginBottom: 6 }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setP(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(220,50,50,.15)",
              border: "1px solid rgba(220,50,50,.3)",
              color: "#f88",
              padding: "10px 14px",
              borderRadius: 6,
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#333" : GREEN,
              color: loading ? "#666" : "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background .2s",
            }}
          >
            {loading ? "Anmelden…" : "Anmelden"}
          </button>
        </form>

        <p style={{ color: "#333", fontSize: 11, textAlign: "center", marginTop: 24, marginBottom: 0 }}>
          Zugangsdaten beim Admin anfragen
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#222",
  border: "1px solid #333",
  borderRadius: 6,
  color: "#ddd",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .2s",
};
