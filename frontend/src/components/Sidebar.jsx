import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth }      from "../contexts/AuthContext";
import { useApp }       from "../contexts/AppContext";
import { useAppearance } from "../contexts/AppearanceContext";
import { apiLogout } from "../lib/api";

const TOP_NAV = [
  { to: "/overview",       label: "Overview",        icon: "📊" },
  { to: "/game-overview",  label: "Game Overview",   icon: "🏈" },
  { to: "/field-position", label: "Down & Distance", icon: "📐" },
  { to: "/formations",     label: "Formations",      icon: "🔲" },
  { to: "/personnel",      label: "Personnel",       icon: "👥" },
  { to: "/callsheet",      label: "Callsheet",       icon: "📋" },
  { to: "/roster",         label: "Roster",          icon: "📝" },
];

const LIVE_NAV = [
  { to: "/live",                   label: "Live Tagging", icon: "⚡" },
  { to: "/drawings",               label: "Draw",         icon: "✏️" },
  { to: "/drawings?tab=viewer",    label: "Viewer",       icon: "👁" },
];

// Visible to Coach + Admin (not Player)
const TOOLS_NAV = [
  { to: "/upload",         label: "Upload Data",     icon: "⬆️" },
  { to: "/print",          label: "Print",           icon: "🖨️" },
];

// Admin only
const ADMIN_NAV = [
  { to: "/admin",          label: "Admin",           icon: "⚙️" },
];

// Visible to everyone
const SETTINGS_NAV = [
  { to: "/settings",       label: "Settings",        icon: "🎨" },
];

// ── Inline mini-form ──────────────────────────────────────────────────────────
function InlineForm({ placeholder, onCommit, onCancel }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 8px 4px 24px" }}>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => {
          if (e.key === "Enter" && val.trim()) onCommit(val.trim());
          if (e.key === "Escape") onCancel();
        }}
        style={{
          flex: 1, background: "var(--surface2)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 4,
          padding: "3px 6px", fontSize: 11, outline: "none",
        }}
      />
      <button
        onClick={() => val.trim() && onCommit(val.trim())}
        style={{
          background: "var(--accent)", color: "#111", border: "none",
          borderRadius: 4, padding: "3px 8px", fontSize: 11,
          fontWeight: 700, cursor: "pointer",
        }}
      >✓</button>
      <button
        onClick={onCancel}
        style={{
          background: "transparent", color: "var(--text3)", border: "none",
          borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer",
        }}
      >✕</button>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ to, icon, label }) {
  // For links with query params (e.g. /drawings?tab=viewer), match the full href
  const hasQuery = to.includes("?");
  return (
    <NavLink
      to={to}
      end={hasQuery}
      style={({ isActive }) => {
        // Custom active: for query-param links, check current URL includes query
        const active = hasQuery
          ? window.location.pathname + window.location.search === to ||
            window.location.search.includes(to.split("?")[1])
          : isActive && window.location.search === "";
        return {
          display: "flex", alignItems: "center", gap: 9,
          padding: "7px 12px 7px 16px", borderRadius: 6, margin: "1px 6px",
          fontSize: 12, fontWeight: active ? 600 : 400,
          color: active ? "var(--accent)" : "var(--text2)",
          background: active ? "rgba(92,191,138,.08)" : "transparent",
          textDecoration: "none", transition: "background .12s, color .12s",
          cursor: "pointer",
        };
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout }           = useAuth();
  const { teamIcon }               = useAppearance();
  const {
    seasons, selectedSeason, selectSeason,
    games,   selectedGame,   setSelectedGame,
    mode,    setMode,
    sidebarOpen, setSidebarOpen,
    activeUsers,
  } = useApp();
  const navigate = useNavigate();

  const isAdmin = user?.role === "Admin";
  const isCoach = user?.role === "Coach" || isAdmin;

  async function handleLogout() {
    try { await apiLogout(); } catch {}
    if (logout) logout();
    navigate("/login");
  }

  if (!sidebarOpen) {
    return (
      <div style={{
        width: 36, background: "var(--surface)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 12, gap: 4,
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: "transparent", border: "none", color: "var(--text3)",
            fontSize: 16, cursor: "pointer", padding: 4,
          }}
          title="Open sidebar"
        >☰</button>
      </div>
    );
  }

  return (
    <div style={{
      width: 200, minWidth: 200, background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0, overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 12px 10px 16px",
        borderBottom: "1px solid var(--border)",
      }}>
        <NavLink to="/overview" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <img src={teamIcon || "/icon.png"} alt="icon"
            style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800, fontSize: 19, color: "var(--accent)", letterSpacing: 3,
          }}>
            DEF LAB
          </span>
        </NavLink>
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            background: "transparent", border: "none", color: "var(--text3)",
            fontSize: 14, cursor: "pointer", padding: 2,
          }}
          title="Sidebar einklappen"
        >‹</button>
      </div>

      {/* Mode toggle */}
      <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          display: "flex", background: "var(--surface2)",
          borderRadius: 6, padding: 2, gap: 2,
        }}>
          {["prep","live"].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: "4px 0", border: "none", borderRadius: 5,
                background: mode === m ? (m === "live" ? "#C0392B" : "#154734") : "transparent",
                color: mode === m ? "#fff" : "var(--text3)",
                fontWeight: 700, fontSize: 11, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: .5,
              }}
            >
              {m === "live" ? (
                <span>
                  ● LIVE
                  {activeUsers > 0 && (
                    <span style={{
                      marginLeft: 4, background: "#fff", color: "#C0392B",
                      borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 800,
                    }}>{activeUsers}</span>
                  )}
                </span>
              ) : "PREP"}
            </button>
          ))}
        </div>
      </div>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div style={{ padding: "8px 10px 4px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, marginBottom: 4 }}>
            SEASON
          </div>
          <select
            value={selectedSeason?.id ?? ""}
            onChange={e => {
              const s = seasons.find(x => String(x.id) === e.target.value);
              if (s) selectSeason(s);
            }}
            style={{
              width: "100%", background: "var(--surface2)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 5,
              padding: "4px 6px", fontSize: 11, outline: "none",
            }}
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name || s.year}</option>
            ))}
          </select>
        </div>
      )}

      {/* Game selector */}
      {games.length > 0 && (
        <div style={{ padding: "4px 10px 8px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, marginBottom: 4 }}>
            GAME
          </div>
          <select
            value={selectedGame?.id ?? ""}
            onChange={e => {
              const g = games.find(x => String(x.id) === e.target.value);
              if (g) setSelectedGame(g);
            }}
            style={{
              width: "100%", background: "var(--surface2)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 5,
              padding: "4px 6px", fontSize: 11, outline: "none",
            }}
          >
            {games.map(g => (
              <option key={g.id} value={g.id}>
                Wk {g.week} {g.opponent || ""}
              </option>
            ))}
          </select>
          {selectedGame && (
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, paddingLeft: 2 }}>
              {selectedGame.date || ""}
            </div>
          )}
        </div>
      )}

      {/* Main navigation */}
      <nav style={{ flex: 1, paddingTop: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, padding: "6px 16px 2px" }}>
          ANALYSIS
        </div>
        {TOP_NAV.map(item => <NavItem key={item.to} {...item} />)}

        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, padding: "10px 16px 2px" }}>
          LIVE
        </div>
        {LIVE_NAV.map(item => <NavItem key={item.to} {...item} />)}

        {isCoach && (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, padding: "10px 16px 2px" }}>
              TOOLS
            </div>
            {TOOLS_NAV.map(item => <NavItem key={item.to} {...item} />)}
          </>
        )}

        {isAdmin && (
          <>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, padding: "10px 16px 2px" }}>
              ADMIN
            </div>
            {ADMIN_NAV.map(item => <NavItem key={item.to} {...item} />)}
          </>
        )}

        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", letterSpacing: .8, padding: "10px 16px 2px" }}>
          EINSTELLUNGEN
        </div>
        {SETTINGS_NAV.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      {/* Footer: user info + logout */}
      <div style={{
        borderTop: "1px solid var(--border)", padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ fontSize: 11, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--text3)" }}>@</span> {user?.display_name || user?.username}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <NavLink
            to="/admin"
            style={{ display: isAdmin ? "block" : "none", fontSize: 10, color: "var(--text3)", textDecoration: "none" }}
          >
          </NavLink>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", background: "transparent", border: "1px solid var(--border)",
              color: "var(--text3)", borderRadius: 5, padding: "4px 0",
              fontSize: 11, cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
