import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useApp }  from "../contexts/AppContext";

const UNICORNS_GREEN = "#154734";
const ACCENT         = "#5CBF8A";

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  overview:   "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  formations: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  personnel:  "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  live:       "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  opponent:   "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  callsheet:  "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  roster:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  admin:      "M12 1l3 6 6.5 1-5 4.5 1.5 6.5L12 16l-6 3.5 1.5-6.5L2.5 8.5 9 7.5z",
  chevronL:   "M15 18l-6-6 6-6",
  chevronR:   "M9 18l6-6-6-6",
  logout:     "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

const NAV_ITEMS = [
  { to: "/overview",   label: "Übersicht",       icon: "overview"   },
  { to: "/formations", label: "Formationen",      icon: "formations" },
  { to: "/personnel",  label: "Personnel",        icon: "personnel"  },
  { to: "/live",       label: "Live Tagging",     icon: "live"       },
  { to: "/opponent",   label: "Gegner",           icon: "opponent"   },
  { to: "/callsheet",  label: "Callsheet",        icon: "callsheet"  },
  { to: "/roster",     label: "Roster",           icon: "roster"     },
];

export default function Sidebar() {
  const { user, logout }                              = useAuth();
  const { seasons, selectedSeason, selectSeason,
          games, selectedGame, setSelectedGame,
          mode, setMode,
          sidebarOpen, setSidebarOpen }               = useApp();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate("/"); }

  const isAdmin = user?.role === "Admin";
  const navItems = isAdmin
    ? [...NAV_ITEMS, { to: "/admin", label: "Admin", icon: "admin" }]
    : NAV_ITEMS;

  return (
    <aside style={{
      width: sidebarOpen ? 220 : 56,
      minWidth: sidebarOpen ? 220 : 56,
      background: "#1a1a1a",
      borderRight: `1px solid #2a2a2a`,
      display: "flex",
      flexDirection: "column",
      transition: "width .2s ease, min-width .2s ease",
      overflow: "hidden",
      height: "100vh",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Header / logo */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "space-between" : "center",
        padding: sidebarOpen ? "14px 12px 10px" : "14px 0 10px",
        borderBottom: "1px solid #2a2a2a",
        minHeight: 52,
      }}>
        {sidebarOpen && (
          <span style={{ color: ACCENT, fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>
            DEF LAB
          </span>
        )}
        <button onClick={() => setSidebarOpen(o => !o)} style={{
          background: "none", border: "none", color: "#888", cursor: "pointer",
          padding: 4, borderRadius: 4, display: "flex",
        }}>
          <Icon d={sidebarOpen ? ICONS.chevronL : ICONS.chevronR} size={18} />
        </button>
      </div>

      {/* Season selector */}
      {sidebarOpen && (
        <div style={{ padding: "10px 12px 4px" }}>
          <label style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: .8 }}>
            Saison
          </label>
          <select value={selectedSeason?.id || ""} onChange={e => {
            const s = seasons.find(x => x.id === e.target.value);
            if (s) selectSeason(s);
          }} style={selectStyle}>
            {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Game selector */}
      {sidebarOpen && (
        <div style={{ padding: "4px 12px 8px" }}>
          <label style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: .8 }}>
            Spiel
          </label>
          <select value={selectedGame?.id || ""} onChange={e => {
            const g = games.find(x => x.id === e.target.value);
            setSelectedGame(g || null);
          }} style={selectStyle}>
            <option value="">– Kein Spiel –</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>
                W{g.week} vs. {g.opponent}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mode toggle */}
      {sidebarOpen && (
        <div style={{ padding: "0 12px 10px", display: "flex", gap: 4 }}>
          {["prep","live"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "5px 0", borderRadius: 4, border: "none",
              background: mode === m ? UNICORNS_GREEN : "#2a2a2a",
              color: mode === m ? "#fff" : "#888",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize",
            }}>
              {m === "prep" ? "Prep" : "Live"}
            </button>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid #2a2a2a", marginBottom: 4 }} />

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: "flex",
            alignItems: "center",
            gap: sidebarOpen ? 10 : 0,
            justifyContent: sidebarOpen ? "flex-start" : "center",
            padding: sidebarOpen ? "9px 14px" : "9px 0",
            color: isActive ? ACCENT : "#aaa",
            background: isActive ? "rgba(92,191,138,.08)" : "transparent",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
            transition: "background .15s",
          })}>
            <span style={{ flexShrink: 0 }}>
              <Icon d={ICONS[icon]} size={18} />
            </span>
            {sidebarOpen && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ borderTop: "1px solid #2a2a2a", padding: sidebarOpen ? "10px 12px" : "10px 0" }}>
        {sidebarOpen ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#ddd", fontSize: 13, fontWeight: 600 }}>
                {user?.displayName || user?.username}
              </div>
              <div style={{ color: "#555", fontSize: 11 }}>{user?.role}</div>
            </div>
            <button onClick={handleLogout} title="Logout" style={{
              background: "none", border: "none", color: "#666", cursor: "pointer",
              padding: 4, borderRadius: 4, display: "flex",
            }}>
              <Icon d={ICONS.logout} size={18} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={handleLogout} title="Logout" style={{
              background: "none", border: "none", color: "#666", cursor: "pointer",
              padding: 4, borderRadius: 4, display: "flex",
            }}>
              <Icon d={ICONS.logout} size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

const selectStyle = {
  width: "100%",
  background: "#222",
  color: "#ddd",
  border: "1px solid #333",
  borderRadius: 4,
  padding: "5px 6px",
  fontSize: 12,
  marginTop: 4,
  outline: "none",
};
