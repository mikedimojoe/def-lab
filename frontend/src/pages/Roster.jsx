import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { apiGetRoster, apiSaveRoster } from "../lib/api";
import { getNatStyle } from "../lib/natStyle";

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

// getNatStyle imported from lib/natStyle.js

const EMPTY_ROSTER = () => ({
  opponent: "",
  depth: Object.fromEntries(POSITIONS.map(p => [p.key, []])),
  importData: null,
});

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
            const nat   = (p.nationality || "").toUpperCase().trim();
            const nat3  = nat.slice(0, 3);
            const ns    = getNatStyle(nat);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center",
                gap: 3, padding: "3px 6px", borderBottom: "1px solid var(--border)" }}>
                {/* Color dot */}
                <div onClick={() => !locked && onCycleColor(pos.key, p)}
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
                {/* Nationality badge — 3-letter, coloured by getNatStyle */}
                {nat3 && (
                  <span style={{
                    background: ns.boxBg, color: ns.boxFg,
                    fontSize: 8, fontWeight: 800, padding: "1px 4px",
                    borderRadius: 2, flexShrink: 0, letterSpacing: "0.03em",
                    border: nat3 === "DE" || nat3 === "DEU" ? "1px solid #444" : "none",
                  }}>{nat3}</span>
                )}
                {/* Name — coloured by nationality group */}
                <span onClick={() => !locked && onEdit(pos.key, p)}
                  style={{
                    color: nat3 ? ns.nameColor : "var(--text2)",
                    fontSize: 11, flex: 1, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                    cursor: locked ? "default" : "pointer",
                  }}>
                  {[p.lastname, p.firstname].filter(Boolean).join(", ") || "—"}
                </span>
                {!locked && (
                  <button onClick={() => onRemove(pos.key, p)}
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

  const [roster, setRoster] = useState(EMPTY_ROSTER());
  const [locked,  setLocked]  = useState(false);
  const [dialog,  setDialog]  = useState(null); // { posKey, player, idx }
  const saveTimer = useRef(null);

  // Load roster from API when game changes
  useEffect(() => {
    if (!selectedGame) { setRoster(EMPTY_ROSTER()); return; }
    apiGetRoster(selectedGame.id)
      .then(data => {
        if (data && (data.depth || data.opponent !== undefined)) {
          setRoster({ ...EMPTY_ROSTER(), ...data });
        } else {
          setRoster(EMPTY_ROSTER());
        }
      })
      .catch(() => setRoster(EMPTY_ROSTER()));
  }, [selectedGame?.id]);

  function persist(updater) {
    setRoster(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (selectedGame) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          apiSaveRoster(selectedGame.id, next).catch(e => console.warn('saveRoster:', e));
        }, 800);
      }
      return next;
    });
  }

  const getPlayers = key => (roster.depth?.[key] || [])
    .slice()
    .sort((a, b) => (a.dcPos ?? 9999) - (b.dcPos ?? 9999));

  function handleAdd(posKey) {
    setDialog({ posKey, player: null, idx: null });
  }

  // Handlers receive the player OBJECT (from the sorted display array) so we can
  // safely locate the correct index in the unsorted storage array via indexOf.
  function handleEdit(posKey, player) {
    const arr = roster.depth?.[posKey] || [];
    const idx = arr.indexOf(player);
    setDialog({ posKey, player, idx });
  }

  function handleRemove(posKey, player) {
    persist(prev => {
      const newDepth = { ...prev.depth };
      const arr  = [...(newDepth[posKey] || [])];
      const idx  = arr.indexOf(player);
      if (idx !== -1) arr.splice(idx, 1);
      newDepth[posKey] = arr;
      return { ...prev, depth: newDepth };
    });
  }

  function handleCycleColor(posKey, player) {
    persist(prev => {
      const newDepth = { ...prev.depth };
      const arr  = [...(newDepth[posKey] || [])];
      const idx  = arr.indexOf(player);
      if (idx === -1) return prev;
      const cur    = arr[idx]?.markColor;
      const curIdx = MARK_COLORS.indexOf(cur);
      arr[idx] = { ...arr[idx], markColor: MARK_COLORS[(curIdx + 1) % MARK_COLORS.length] };
      newDepth[posKey] = arr;
      return { ...prev, depth: newDepth };
    });
  }

  function handleSavePlayer(posKey, idx, form) {
    // If the position field was changed to a valid slot key, move the player there
    const VALID_KEYS = new Set(POSITIONS.map(p => p.key));
    const rawPos  = (form.position || "").trim().toUpperCase().replace(/\s+/g, "_");
    const destKey = VALID_KEYS.has(rawPos) ? rawPos : posKey;

    persist(prev => {
      const newDepth = { ...prev.depth };
      const p = {
        number:      form.number,
        firstname:   form.firstname,
        lastname:    form.lastname,
        nationality: form.nationality,
        position:    form.position,
        dcPos:       form.dcPos ? parseInt(form.dcPos) : null,
        markColor:   form.markColor,
      };

      if (idx !== null && destKey !== posKey) {
        // ── Move: remove from source slot, append to destination slot ──
        const srcArr = [...(newDepth[posKey] || [])];
        srcArr.splice(idx, 1);
        newDepth[posKey] = srcArr;

        const dstArr = [...(newDepth[destKey] || [])];
        dstArr.push(p);
        newDepth[destKey] = dstArr;
      } else {
        // ── Stay in same slot ──
        const arr = [...(newDepth[posKey] || [])];
        if (idx === null) {
          arr.push(p);
        } else {
          arr[idx] = p;
        }
        newDepth[posKey] = arr;
      }

      return { ...prev, depth: newDepth };
    });
    setDialog(null);
  }

  function handleClearRoster() {
    if (!confirm("Clear all roster data?")) return;
    persist({ opponent: "", depth: Object.fromEntries(POSITIONS.map(p => [p.key, []])) });
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
          <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { code: "USA", bg: "#C8A951", fg: "#111", label: "USA" },
              { code: "DEU", bg: "#1a1a1a", fg: "#e0e0e0", label: "Deutschland", border: "1px solid #444" },
              { code: "INT", bg: "#1B4D2E", fg: "#fff",   label: "International" },
            ].map(({ code, bg, fg, label, border }) => (
              <div key={code} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ background: bg, color: fg, fontSize: 8, fontWeight: 800,
                  padding: "1px 4px", borderRadius: 2, border: border || "none", letterSpacing: "0.03em" }}>
                  {code}
                </span>
                <span style={{ color: "var(--text3)", fontSize: 11 }}>{label}</span>
              </div>
            ))}
            <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 8 }}>
              · Farbpunkte = Markierungsfarbe (klicken zum Wechseln)
            </span>
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

