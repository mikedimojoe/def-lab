import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth }  from "../contexts/AuthContext";
import { useApp }   from "../contexts/AppContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  createSeason, createGame, deleteGame, deleteSeason,
  getGames,
} from "../lib/storage";

const GREEN  = "#154734";
const ACCENT = "#5CBF8A";

const Icon = ({ d, size = 18 }) => (
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
  chevronD:   "M6 9l6 6 6-6",
  chevronU:   "M18 15l-6-6-6 6",
  logout:     "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  folder:     "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  file:       "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  plus:       "M12 5v14M5 12h14",
  trash:      "M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2",
};

const NAV_ITEMS = [
  { to: "/overview",   label: "Overview",         icon: "overview"   },
  { to: "/formations", label: "Formations",        icon: "formations" },
  { to: "/personnel",  label: "Personnel",         icon: "personnel"  },
  { to: "/live",       label: "Live Tagging",      icon: "live"       },
  { to: "/opponent",   label: "Opponent",          icon: "opponent"   },
  { to: "/callsheet",  label: "Callsheet",         icon: "callsheet"  },
  { to: "/roster",     label: "Roster",            icon: "roster"     },
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
          flex: 1, background: "#0d0d0d", color: "#ddd",
          border: "1px solid #333", borderRadius: 4,
          padding: "3px 6px", fontSize: 11, outline: "none",
        }}
      />
      <button onClick={() => val.trim() && onCommit(val.trim())}
        style={{ background: GREEN, color: "#fff", border: "none",
          borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
        ✓
      </button>
      <button onClick={onCancel}
        style={{ background: "#2a2a2a", color: "#888", border: "none",
          borderRadius: 4, padding: "3px 6px", fontSize: 11, cursor: "pointer" }}>
        ✕
      </button>
    </div>
  );
}

// ── File Explorer tree ────────────────────────────────────────────────────────
function FileExplorer() {
  const { seasons, selectedSeason, selectSeason, refreshSeasons,
          selectedGame, setSelectedGame, refreshGames } = useApp();
  const { user } = useAuth();
  const isAdmin  = user?.role === "Admin";

  const [openSeasons,    setOpenSeasons]    = useState({});
  const [addingSeason,   setAddingSeason]   = useState(false);
  const [addingGame,     setAddingGame]     = useState(null); // seasonId
  const [addingGameStep, setAddingGameStep] = useState(1);   // 1=week, 2=opponent
  const [gameWeek,       setGameWeek]       = useState("");

  function toggleSeason(id) {
    setOpenSeasons(o => ({ ...o, [id]: !o[id] }));
  }

  function handleAddSeason(name) {
    // Try to parse a year from the name, else use current year
    const yearMatch = name.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
    const s = createSeason(year, name);
    refreshSeasons(s.id);
    setOpenSeasons(o => ({ ...o, [s.id]: true }));
    setAddingSeason(false);
  }

  function handleAddGame(seasonId, week, opponent) {
    const g = createGame(seasonId, week, opponent, "");
    refreshGames(seasonId, g.id);
    setAddingGame(null);
    setAddingGameStep(1);
    setGameWeek("");
    // auto-expand the season
    setOpenSeasons(o => ({ ...o, [seasonId]: true }));
    // select this game
    setSelectedGame(g);
    if (selectedSeason?.id !== seasonId) {
      const s = seasons.find(x => x.id === seasonId);
      if (s) selectSeason(s);
    }
  }

  return (
    <div style={{ padding: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center",
        padding: "0 8px 6px", gap: 4 }}>
        <span style={{ color: "#555", fontSize: 10, textTransform: "uppercase",
          letterSpacing: .8, flex: 1 }}>Files</span>
        {isAdmin && (
          <button onClick={() => setAddingSeason(true)}
            title="New season"
            style={{ background: "none", border: "none", color: "#555",
              cursor: "pointer", padding: 2, display: "flex" }}>
            <Icon d={ICONS.plus} size={13} />
          </button>
        )}
      </div>

      {addingSeason && (
        <InlineForm
          placeholder="Season name (e.g. GFL 2026)"
          onCommit={handleAddSeason}
          onCancel={() => setAddingSeason(false)}
        />
      )}

      {seasons.map(season => {
        const games  = getGames(season.id);
        const isOpen = !!openSeasons[season.id];

        return (
          <div key={season.id}>
            {/* Season row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 8px",
              cursor: "pointer",
              borderRadius: 4,
              margin: "0 4px",
              background: selectedSeason?.id === season.id ? "rgba(92,191,138,.07)" : "transparent",
            }}
              onClick={() => { toggleSeason(season.id); selectSeason(season); }}>
              <span style={{ color: "#555", flexShrink: 0 }}>
                <Icon d={isOpen ? ICONS.chevronD : ICONS.chevronR} size={12} />
              </span>
              <span style={{ color: "#555", flexShrink: 0 }}>
                <Icon d={ICONS.folder} size={13} />
              </span>
              <span style={{ color: "#bbb", fontSize: 12, flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {season.name}
              </span>
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); deleteSeason(season.id); refreshSeasons(); }}
                  title="Delete season"
                  style={{ background: "none", border: "none", color: "#333",
                    cursor: "pointer", padding: 1, display: "flex",
                    opacity: 0, transition: "opacity .15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <Icon d={ICONS.trash} size={11} />
                </button>
              )}
            </div>

            {/* Games */}
            {isOpen && (
              <div>
                {games.map(game => {
                  let playCount = 0;
                  try { if (game.playdata) playCount = JSON.parse(game.playdata).length; } catch {}
                  const isActive = selectedGame?.id === game.id;
                  return (
                    <div key={game.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "4px 8px 4px 22px",
                        cursor: "pointer", borderRadius: 4, margin: "0 4px",
                        background: isActive ? "rgba(92,191,138,.1)" : "transparent",
                        borderLeft: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
                      }}
                      onClick={() => { setSelectedGame(game); selectSeason(season); }}>
                      <span style={{ color: isActive ? ACCENT : "#444", flexShrink: 0 }}>
                        <Icon d={ICONS.file} size={12} />
                      </span>
                      <span style={{ fontSize: 11, flex: 1,
                        color: isActive ? ACCENT : "#888",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        W{game.week} · {game.opponent}
                      </span>
                      {playCount > 0 && (
                        <span style={{ fontSize: 9, color: "#154734",
                          background: "rgba(92,191,138,.12)", padding: "1px 4px",
                          borderRadius: 3, flexShrink: 0 }}>
                          {playCount}
                        </span>
                      )}
                      {isAdmin && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteGame(game.id);
                            if (selectedGame?.id === game.id) setSelectedGame(null);
                            refreshGames(season.id);
                          }}
                          title="Delete game"
                          style={{ background: "none", border: "none", color: "#333",
                            cursor: "pointer", padding: 1, display: "flex",
                            opacity: 0, transition: "opacity .15s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <Icon d={ICONS.trash} size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add game row */}
                {isAdmin && addingGame !== season.id && (
                  <button
                    onClick={() => { setAddingGame(season.id); setAddingGameStep(1); setGameWeek(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 8px 3px 22px",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#444", fontSize: 11, width: "100%",
                    }}>
                    <Icon d={ICONS.plus} size={11} />
                    Add game
                  </button>
                )}

                {isAdmin && addingGame === season.id && addingGameStep === 1 && (
                  <InlineForm
                    placeholder="Week # (e.g. 1)"
                    onCommit={week => { setGameWeek(week); setAddingGameStep(2); }}
                    onCancel={() => { setAddingGame(null); setAddingGameStep(1); }}
                  />
                )}

                {isAdmin && addingGame === season.id && addingGameStep === 2 && (
                  <InlineForm
                    placeholder="Opponent"
                    onCommit={opponent => handleAddGame(season.id, gameWeek, opponent)}
                    onCancel={() => { setAddingGame(null); setAddingGameStep(1); }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {seasons.length === 0 && !addingSeason && (
        <p style={{ color: "#333", fontSize: 11, padding: "4px 12px" }}>No seasons yet</p>
      )}
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
function SettingsPanel({ onClose }) {
  const { theme, toggle } = useTheme();
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.6)",
      zIndex: 400, display: "flex", alignItems: "flex-end",
      justifyContent: "flex-start",
    }} onClick={onClose}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "0 12px 0 0", padding: "18px 20px", width: 240,
        marginBottom: 0,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16 }}>
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>Settings</span>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: "var(--text3)", cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text2)", fontSize: 13 }}>
            {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </span>
          <button onClick={toggle} style={{
            width: 40, height: 22, borderRadius: 11, border: "none",
            background: theme === "dark" ? "#154734" : "#ddd",
            cursor: "pointer", position: "relative", transition: "background .2s",
          }}>
            <span style={{
              position: "absolute", top: 3,
              left: theme === "dark" ? 20 : 3,
              width: 16, height: 16, borderRadius: "50%",
              background: theme === "dark" ? "#5CBF8A" : "#fff",
              transition: "left .2s",
              boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout }                               = useAuth();
  const { mode, setMode, sidebarOpen, setSidebarOpen } = useApp();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  function handleLogout() { logout(); navigate("/"); }

  const isAdmin  = user?.role === "Admin";
  const navItems = isAdmin
    ? [...NAV_ITEMS, { to: "/admin", label: "Admin", icon: "admin" }]
    : NAV_ITEMS;

  return (
    <aside style={{
      width: sidebarOpen ? 220 : 52,
      minWidth: sidebarOpen ? 220 : 52,
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      transition: "width .2s ease, min-width .2s ease",
      overflow: "hidden",
      height: "100vh",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Brand + collapse toggle */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: sidebarOpen ? "space-between" : "center",
        padding: sidebarOpen ? "13px 10px 10px" : "13px 0 10px",
        borderBottom: "1px solid var(--border)",
        minHeight: 48,
      }}>
        {sidebarOpen && (
          <span style={{
            color: "#154734",
            fontWeight: 800, fontSize: 14, letterSpacing: 2,
            background: "#5CBF8A",
            padding: "2px 8px", borderRadius: 4,
          }}>
            DEF LAB
          </span>
        )}
        <button onClick={() => setSidebarOpen(o => !o)} style={{
          background: "none", border: "none", color: "var(--text3)", cursor: "pointer",
          padding: 4, borderRadius: 4, display: "flex",
        }}>
          <Icon d={sidebarOpen ? ICONS.chevronL : ICONS.chevronR} size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* File Explorer — only when expanded */}
        {sidebarOpen && (
          <>
            <FileExplorer />
            <div style={{ borderTop: "1px solid var(--border)", margin: "2px 0 6px" }} />
          </>
        )}

        {/* Mode toggle */}
        {sidebarOpen && (
          <div style={{ padding: "0 10px 10px", display: "flex", gap: 4 }}>
            {["prep","live"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "5px 0", borderRadius: 4, border: "none",
                background: mode === m ? GREEN : "var(--surface2)",
                color: mode === m ? "#fff" : "var(--text3)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                textTransform: "uppercase", letterSpacing: .5,
              }}>
                {m}
              </button>
            ))}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--border)", marginBottom: 2 }} />

        {/* Nav links */}
        <nav style={{ padding: "4px 0" }}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: sidebarOpen ? 10 : 0,
              justifyContent: sidebarOpen ? "flex-start" : "center",
              padding: sidebarOpen ? "8px 12px" : "8px 0",
              color: isActive ? ACCENT : "var(--text3)",
              background: isActive ? "rgba(92,191,138,.07)" : "transparent",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
              transition: "background .15s",
            })}>
              <span style={{ flexShrink: 0 }}>
                <Icon d={ICONS[icon]} size={16} />
              </span>
              {sidebarOpen && (
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom: settings + user + logout */}
      <div style={{ borderTop: "1px solid var(--border)",
        padding: sidebarOpen ? "8px 10px" : "8px 0" }}>

        {/* Settings gear */}
        <div style={{
          display: "flex", justifyContent: sidebarOpen ? "flex-start" : "center",
          marginBottom: 6,
        }}>
          <button onClick={() => setShowSettings(s => !s)} title="Settings" style={{
            display: "flex", alignItems: "center", gap: sidebarOpen ? 8 : 0,
            background: "none", border: "none", color: "var(--text3)",
            cursor: "pointer", padding: "4px 2px", borderRadius: 4, fontSize: 12,
          }}>
            <Icon d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" size={15} />
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>

        {/* User row */}
        {sidebarOpen ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.displayName || user?.username}
              </div>
              <div style={{ color: "var(--text3)", fontSize: 10 }}>{user?.role}</div>
            </div>
            <button onClick={handleLogout} title="Sign out" style={{
              background: "none", border: "none", color: "var(--text3)", cursor: "pointer",
              padding: 4, borderRadius: 4, display: "flex", flexShrink: 0,
            }}>
              <Icon d={ICONS.logout} size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={handleLogout} title="Sign out" style={{
              background: "none", border: "none", color: "var(--text3)", cursor: "pointer",
              padding: 4, borderRadius: 4, display: "flex",
            }}>
              <Icon d={ICONS.logout} size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
