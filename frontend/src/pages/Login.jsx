import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUsers, updateUserPassword } from "../lib/storage";

const GREEN  = "#154734";
const ACCENT = "#5CBF8A";

export default function Login() {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [params]              = useSearchParams();

  // Invitation link support: ?invite=<userId>&pw=<plainPassword>
  const inviteUserId  = params.get("invite");
  const inviteToken   = params.get("pw");

  const [username,  setU]     = useState("");
  const [password,  setP]     = useState("");
  const [newPw,     setNP]    = useState("");
  const [newPw2,    setNP2]   = useState("");
  const [error,     setError] = useState("");
  const [info,      setInfo]  = useState("");
  const [loading,   setL]     = useState(false);
  const [inviteMode, setIM]   = useState(false);
  const [inviteUser, setIU]   = useState(null);

  // Detect invitation link
  useEffect(() => {
    if (!inviteUserId || !inviteToken) return;
    const users = getUsers();
    const u = users.find(x => x.id === inviteUserId);
    if (!u) { setError("Invalid invitation link."); return; }
    setIU(u);
    setU(u.username);
    setP(inviteToken);
    setIM(true);
    setInfo(`Welcome, ${u.displayName || u.username}! Please set a new password to activate your account.`);
  }, [inviteUserId, inviteToken]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setL(true);
    try {
      await login(username, password);
      navigate("/overview");
    } catch (err) {
      setError("Invalid username or password");
    } finally {
      setL(false);
    }
  }

  async function handleActivate(e) {
    e.preventDefault();
    if (!newPw || newPw !== newPw2) { setError("Passwords do not match"); return; }
    if (newPw.length < 4) { setError("Password must be at least 4 characters"); return; }
    setL(true);
    try {
      // First verify the invite token works as current password
      await login(username, inviteToken);
      // Then update to new password
      await updateUserPassword(inviteUser.id, newPw);
      // Re-login with new password
      await login(username, newPw);
      navigate("/overview");
    } catch {
      setError("Invitation link is invalid or expired.");
    } finally {
      setL(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#111",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12,
        padding: "44px 38px", width: 360,
        boxShadow: "0 20px 60px rgba(0,0,0,.6)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{
            width: 52, height: 52, background: GREEN, borderRadius: "50%",
            margin: "0 auto 12px", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 22,
          }}>🦄</div>
          <h1 style={{ color: "#eee", fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: 1 }}>
            DEF LAB
          </h1>
          <p style={{ color: "#444", fontSize: 12, margin: "5px 0 0" }}>
            Schwäbisch Hall Unicorns
          </p>
        </div>

        {info && (
          <div style={{
            background: "rgba(92,191,138,.1)", border: "1px solid rgba(92,191,138,.2)",
            color: "#5CBF8A", padding: "10px 14px", borderRadius: 6,
            fontSize: 12, marginBottom: 16,
          }}>{info}</div>
        )}

        {inviteMode ? (
          <form onSubmit={handleActivate}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Username</label>
              <input value={username} readOnly style={{ ...inputStyle, opacity: .5 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" value={newPw} onChange={e => setNP(e.target.value)}
                placeholder="Choose a password" autoFocus style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" value={newPw2} onChange={e => setNP2(e.target.value)}
                placeholder="Repeat password" style={inputStyle} />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading} style={submitBtn(loading)}>
              {loading ? "Activating…" : "Activate Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Username</label>
              <input value={username} onChange={e => setU(e.target.value)}
                autoFocus placeholder="username" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setP(e.target.value)}
                placeholder="••••••••" style={inputStyle} />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading || !username || !password} style={submitBtn(loading)}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        )}

        <p style={{ color: "#2a2a2a", fontSize: 11, textAlign: "center", marginTop: 20, marginBottom: 0 }}>
          Contact your admin for access
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: "rgba(220,50,50,.12)", border: "1px solid rgba(220,50,50,.25)",
      color: "#f88", padding: "9px 12px", borderRadius: 6,
      fontSize: 12, marginBottom: 14,
    }}>{msg}</div>
  );
}

const labelStyle = { display: "block", color: "#666", fontSize: 11, marginBottom: 5 };
const inputStyle = {
  width: "100%", background: "#1e1e1e", border: "1px solid #2a2a2a",
  borderRadius: 6, color: "#ddd", padding: "9px 11px", fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
const submitBtn = (loading) => ({
  width: "100%", padding: "11px", background: loading ? "#333" : "#154734",
  color: loading ? "#555" : "#fff", border: "none", borderRadius: 6,
  fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
});
