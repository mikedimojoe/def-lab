import { useState, useEffect, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";

const GREEN  = "#154734";
const ACCENT = "#5CBF8A";

// Depth chart positions layout (col, row for grid)
// Each slot: { key, label, col, row }
const POSITIONS = [
  { key: "QB",   label: "QB",    col: 3, row: 0 },
  { key: "RB",   label: "RB",    col: 5, row: 0 },
  { key: "FB",   label: "FB",    col: 3, row: 1 },
  { key: "TE",   label: "TE",    col: 0, row: 2 },
  { key: "SB",   label: "SB",    col: 6, row: 2 },
  { key: "WR_L", label: "WR",    col: 0, row: 3 },
  { key: "LT",   label: "LT",    col: 1, row: 3 },
  { key: "LG",   label: "LG",    col: 2, row: 3 },
  { key: "C",    label: "C",     col: 3, row: 3 },
  { key: "RG",   label: "RG",    col: 4, row: 3 },
  { key: "RT",   label: "RT",    col: 5, row: 3 },
  { key: "WR_R", label: "WR",    col: 6, row: 3 },
];

const MARK_COLORS = [null, "#2E7D32", "#1565C0", "#C62828", "#F9A825", "#E65100", "#6A1B9A"];
const MARK_LABELS = ["None", "Green", "Blue", "Red", "Yellow", "Orange", "Purple"];

const NAT_COLORS = {
  US:  { bg: "#B22234", fg: "#fff" },
  DE:  { bg: "#000000", fg: "#ffcc00" },
  DEU: { bg: "#000000", fg: "#ffcc00" },
  AT:  { bg: "#ED2939", fg: "#fff" },
  AUT: { bg: "#ED2939", fg: "#fff" },
  CH:  { bg: "#FF0000", fg: "#fff" },
  CHE: { bg: "#FF0000", fg: "#fff" },
};

function natBadgeStyle(code) {
  const c = NAT_COLORS[code?.toUpperCase()];
  return c || { bg: "#333", fg: "#aaa" };
}

// ── Storage helpers ───────────────────────────────────────────────────────────
function rosterKey(gameId) { return `dl_roster_${gameId}`; }

function loadRoster(gameId) {
  try {
    const raw = localStorage.getItem(rosterKey(gameId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { opponent: "", depth: Object.fromEntries(POSITIONS.map(p => [p.key, []])) };
}

function saveRoster(gameId, data) {
  localStorage.setItem(rosterKey(gameId), JSON.stringify(data));
}

// ── Player add/edit dialog ────────────────────────────────────────────────────
function PlayerDialog({ posKey, player, onSave, onClose }) {
  const [form, setForm] = useState({
    number:    player?.number    || "",
    firstname: player?.firstname || "",
    lastname:  player?.lastname  || "",
    nationality: player?.nationality || "",
    position:  player?.position  || posKey,
    dcPos:     player?.dcPos     != null ? String(player.dcPos) : "",
    markColor: player?.markColor || null,
  });

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
      zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 24, width: 340, maxWidth: "95vw" }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ color: "var(--text)", margin: "0 0 16px", fontSize: 15 }}>
          {player ? "Edit Player" : "Add Player"} — {posKey}
        </h3>

        {[
          ["# Jersey",    "number",    "text", 80],
          ["First name",  "firstname", "text", 190],
          ["Last name",   "lastname",  "text", 190],
          ["Nationality", "nationality","text", 80],
          ["Position",    "position",  "text", 100],
          ["Depth pos.",  "dcPos",     "number", 60],
        ].map(([label, key, type, w]) => (
          <div key={key} style={{ display: "flex", alignItems: "center",
            gap: 8, marginBottom: 8 }}>
            <label style={{ color: "var(--text3)", fontSize: 12, width: 90, flexShrink: 0 }}>
              {label}
            </label>
            <input type={type} value={form[key]} onChange={f(key)}
              style={{ background: "var(--surface2)", color: "var(--text)",
                border: "1px solid var(--border)", borderRadius: 4,
                padding: "5px 8px", fontSize: 12, outline: "none", width: w }} />
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <label style={{ color: "var(--text3)", fontSize: 12, width: 90, flexShrink: 0 }}>
            Mark color
          </label>
          <select value={form.markColor || "null"}
            onChange={e => setForm(p => ({ ...p, markColor: e.target.value === "null" ? null : e.target.value }))}
            style={{ background: "var(--surface2)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 4,
              padding: "5px 8px", fontSize: 12, outline: "none" }}>
            {MARK_COLORS.map((c, i) => (
              <option key={i} value={c === null ? "null" : c}>{MARK_LABELS[i]}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ background: "var(--surface2)", color: "var(--text3)",
              border: "none", borderRadius: 6, padding: "7px 14px",
              fontSize: 12, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => onSave(form)}
            style={{ background: GREEN, color: "#fff",
              border: "none", borderRadius: 6, padding: "7px 14px",
              fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Depth slot box ────────────────────────────────────────────────────────────
function DepthSlot({ pos, players, locked, onAdd, onEdit, onRemove, onCycleColor }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 6, overflow: "hidden", minWidth: 110,
    }}>
      <div style={{ background: GREEN, padding: "5px 8px", textAlign: "center" }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>{pos.label}</span>
      </div>
      <div style={{ padding: "4px 0" }}>
        {players.length === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: 11, padding: "6px 8px",
            fontStyle: "italic" }}>—</div>
        ) : (
          players.map((p, i) => {
            const nat = (p.nationality || "").toUpperCase().slice(0, 3);
            const badge = natBadgeStyle(nat);
            const isUS  = nat === "US";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center",
                gap: 3, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
                {/* Color dot */}
                <div onClick={() => !locked && onCycleColor(pos.key, i)}
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: p.markColor || "var(--border)",
                    flexShrink: 0, cursor: locked ? "default" : "pointer",
                    border: "1px solid var(--border)",
                  }} />
                {/* Jersey # */}
                {p.number && (
                  <span style={{ color: "var(--text3)", fontSize: 10,
                    fontWeight: 700, width: 20, textAlign: "right", flexShrink: 0 }}>
                    #{p.number}
                  </span>
                )}
                {/* Nationality badge */}
                {nat && (
                  <span style={{
                    background: badge.bg, color: badge.fg,
                    fontSize: 8, fontWeight: 700, padding: "1px 3px",
                    borderRadius: 2, flexShrink: 0,
                  }}>{nat.slice(0, 2)}</span>
                )}
                {/* Name */}
                <span onClick={() => !locked && onEdit(pos.key, i)}
                  style={{
                    color: isUS ? "#C8A951" : "var(--text2)",
                    fontSize: 11, flex: 1, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                    cursor: locked ? "default" : "pointer",
                  }}>
                  {[p.lastname, p.firstname].filter(Boolean).join(", ") || "—"}
                </span>
                {!locked && (
                  <button onClick={() => onRemove(pos.key, i)}
                    style={{ background: "none", border: "none", color: "var(--text3)",
                      cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 }}>
                    ✕
                  </button>
                )}
              </div>
            );
          })
        )}
        {!locked && (
          <button onClick={() => onAdd(pos.key)}
            style={{ width: "100%", background: "none", border: "none",
              color: "var(--text3)", cursor: "pointer", fontSize: 11,
              padding: "4px 6px", textAlign: "left" }}>
            ＋ add
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Roster page ──────────────────────────────────────────────────────────
export default function Roster() {
  const { selectedGame } = useApp();
  const { user }         = useAuth();
  const canEdit          = user?.role === "Admin" || user?.role === "Coach";

  const [roster, setRoster] = useState({ opponent: "", depth: {} });
  const [locked,  setLocked]  = useState(false);
  const [dialog,  setDialog]  = useState(null); // { posKey, player, idx }

  // Load roster when game changes
  useEffect(() => {
    if (!selectedGame) { setRoster({ opponent: "", depth: {} }); return; }
    setRoster(loadRoster(selectedGame.id));
  }, [selectedGame?.id]);

  function persist(updater) {
    setRoster(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (selectedGame) saveRoster(selectedGame.id, next);
      return next;
    });
  }

  const getPlayers = key => (roster.depth?.[key] || [])
    .slice()
    .sort((a, b) => (a.dcPos ?? 9999) - (b.dcPos ?? 9999));

  function handleAdd(posKey) {
    setDialog({ posKey, player: null, idx: null });
  }

  function handleEdit(posKey, idx) {
    const players = roster.depth?.[posKey] || [];
    setDialog({ posKey, player: players[idx], idx });
  }

  function handleRemove(posKey, idx) {
    persist(prev => {
      const newDepth = { ...prev.depth };
      const arr = [...(newDepth[posKey] || [])];
      arr.splice(idx, 1);
      newDepth[posKey] = arr;
      return { ...prev, depth: newDepth };
    });
  }

  function handleCycleColor(posKey, idx) {
    persist(prev => {
      const newDepth = { ...prev.depth };
      const arr = [...(newDepth[posKey] || [])];
      const cur = arr[idx]?.markColor;
      const curIdx = MARK_COLORS.indexOf(cur);
      arr[idx] = { ...arr[idx], markColor: MARK_COLORS[(curIdx + 1) % MARK_COLORS.length] };
      newDepth[posKey] = arr;
      return { ...prev, depth: newDepth };
    });
  }

  function handleSavePlayer(posKey, idx, form) {
    persist(prev => {
      const newDepth = { ...prev.depth };
      const arr = [...(newDepth[posKey] || [])];
      const p = {
        number:      form.number,
        firstname:   form.firstname,
        lastname:    form.lastname,
        nationality: form.nationality,
        position:    form.position,
        dcPos:       form.dcPos ? parseInt(form.dcPos) : null,
        markColor:   form.markColor,
      };
      if (idx === null) {
        arr.push(p);
      } else {
        arr[idx] = p;
      }
      newDepth[posKey] = arr;
      return { ...prev, depth: newDepth };
    });
    setDialog(null);
  }

  function handleClearRoster() {
    if (!confirm("Clear all roster data?")) return;
    persist({ opponent: "", depth: Object.fromEntries(POSITIONS.map(p => [p.key, []])) });
  }

  // Parse from uploaded rosterData
  function handleImportFromGame() {
    if (!selectedGame?.rosterData) {
      alert("No roster data uploaded for this game.\nGo to Admin → Upload Roster to upload a roster file.");
      return;
    }
    try {
      const parsed = JSON.parse(selectedGame.rosterData);
      // Try to build depth chart from parsed players
      const depth = Object.fromEntries(POSITIONS.map(p => [p.key, []]));
      const players = Array.isArray(parsed) ? parsed : (parsed.players || []);
      players.forEach((p, i) => {
        const pos = String(p.position || p.Position || p.POS || "").toUpperCase();
        // Map common positions to depth slots
        const slotMap = {
          QB: "QB", RB: "RB", FB: "FB", TE: "TE",
          WR: "WR_L", WRL: "WR_L", WRR: "WR_R",
          LWR: "WR_L", RWR: "WR_R", SB: "SB",
          LT: "LT", LG: "LG", C: "C", RG: "RG", RT: "RT",
        };
        const slot = slotMap[pos];
        if (slot && depth[slot]) {
          depth[slot].push({
            number:    String(p.number || p.Number || p.NR || ""),
            firstname: String(p.firstname || p.FirstName || p.FIRST || p.Vorname || ""),
            lastname:  String(p.lastname  || p.LastName  || p.LAST  || p.Nachname || ""),
            nationality: String(p.nationality || p.NAT || ""),
            position: pos,
            dcPos: i + 1,
            markColor: null,
          });
        }
      });
      persist(prev => ({ ...prev, depth }));
    } catch (e) {
      alert("Could not parse roster data: " + e.message);
    }
  }

  // Build grid layout (7 cols)
  // Find max row
  const maxRow = Math.max(...POSITIONS.map(p => p.row));
  const numCols = 7;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>Roster</h2>
        {selectedGame && (
          <span style={{ color: "var(--text3)", fontSize: 13 }}>
            W{selectedGame.week} — {selectedGame.opponent}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {canEdit && selectedGame && (
          <>
            <button onClick={handleImportFromGame} style={btnStyle}>
              📥 Import from Data
            </button>
            <button onClick={handleClearRoster}
              style={{ ...btnStyle, background: "#5a1a1a", color: "#ffaaaa", borderColor: "#8b2222" }}>
              🗑 Clear
            </button>
            <button onClick={() => setLocked(l => !l)}
              style={{ ...btnStyle,
                background: locked ? GREEN : "var(--surface2)",
                color: locked ? "#fff" : "var(--text3)" }}>
              {locked ? "🔒 Locked" : "🔓 Unlocked"}
            </button>
          </>
        )}
      </div>

      {/* Opponent name */}
      {selectedGame && (
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ color: "var(--text3)", fontSize: 12 }}>Opponent:</label>
          <input
            value={roster.opponent || ""}
            onChange={e => persist(p => ({ ...p, opponent: e.target.value }))}
            placeholder="Team name…"
            disabled={locked || !canEdit}
            style={{ background: "var(--surface2)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 4,
              padding: "5px 10px", fontSize: 12, outline: "none", width: 200 }} />
        </div>
      )}

      {!selectedGame ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
          Select a game from the sidebar.
        </div>
      ) : (
        <>
          {/* Depth chart grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${numCols}, 1fr)`,
            gridTemplateRows: `repeat(${maxRow + 1}, auto)`,
            gap: 8,
          }}>
            {POSITIONS.map(pos => (
              <div key={pos.key} style={{
                gridColumn: pos.col + 1,
                gridRow: pos.row + 1,
              }}>
                <DepthSlot
                  pos={pos}
                  players={getPlayers(pos.key)}
                  locked={locked || !canEdit}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onRemove={handleRemove}
                  onCycleColor={handleCycleColor}
                />
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ color: "var(--text3)", fontSize: 11 }}>
              <span style={{ color: "#C8A951", fontWeight: 700 }}>Gold names</span> = US import
            </div>
            <div style={{ color: "var(--text3)", fontSize: 11 }}>
              Color dots = mark color (click to cycle when unlocked)
            </div>
          </div>
        </>
      )}

      {/* Player dialog */}
      {dialog && (
        <PlayerDialog
          posKey={dialog.posKey}
          player={dialog.player}
          onSave={(form) => handleSavePlayer(dialog.posKey, dialog.idx, form)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

const btnStyle = {
  background: "var(--surface2)", color: "var(--text2)",
  border: "1px solid var(--border)", borderRadius: 6,
  padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
