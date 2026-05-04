import { useNavigate } from "react-router-dom";
import { useAppearance } from "../contexts/AppearanceContext";
import { useApp } from "../contexts/AppContext";

/* global __BUILD_DATE__ */
const BUILD_DATE = typeof __BUILD_DATE__ !== "undefined"
  ? new Date(__BUILD_DATE__).toLocaleDateString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

const VERSION = "1.0.0";

export default function Home() {
  const { logo } = useAppearance();
  const { selectedGame } = useApp();
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", padding: "40px 24px", gap: 32,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {logo ? (
          <img src={logo} alt="Logo" style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 16 }} />
        ) : (
          <div style={{
            width: 100, height: 100, borderRadius: 16,
            background: "var(--team-primary, #154734)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "var(--team-secondary, #5CBF8A)", fontWeight: 900, fontSize: 28, letterSpacing: 2 }}>DL</span>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ color: "var(--text)", fontSize: 32, fontWeight: 900, letterSpacing: 3, margin: 0 }}>
            DEF LAB
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 13, margin: "6px 0 0" }}>
            Football Analytics Platform
          </p>
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "24px 32px", maxWidth: 400, width: "100%",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <InfoRow label="Version" value={`v${VERSION}`} />
        <InfoRow label="Deployed" value={BUILD_DATE} />
        <InfoRow label="Environment" value="Production" />
        {selectedGame && (
          <InfoRow label="Active Game" value={`W${selectedGame.week} — ${selectedGame.opponent}`} accent />
        )}
      </div>

      {/* Quick nav */}
      <button
        onClick={() => navigate("/overview")}
        style={{
          background: "var(--team-primary, #154734)", color: "var(--team-secondary, #5CBF8A)",
          border: "none", borderRadius: 8, padding: "12px 32px",
          fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 1,
        }}>
        Go to Overview →
      </button>
    </div>
  );
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text3)", fontSize: 12 }}>{label}</span>
      <span style={{ color: accent ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  );
}
