import { useState, useRef } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import {
  getLiveRows, saveLiveRows,
  getVisibleColumns, saveVisibleColumns,
  ALL_COLUMNS,
} from "../lib/storage";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

function newRow(playNumber) {
  const r = {};
  ALL_COLUMNS.forEach(c => { r[c] = ""; });
  r["PLAY #"] = String(playNumber);
  return r;
}

export default function LiveTagging() {
  const { selectedGame }         = useApp();
  const { user }                 = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows, setRows]           = useState(() =>
    selectedGame ? getLiveRows(selectedGame.id) : []);
  const [visibleCols, setVisible] = useState(getVisibleColumns);
  const [showColMgr,  setColMgr]  = useState(false);
  const [editCell,    setEditCell]= useState(null);
  const [editVal,     setEditVal] = useState("");
  const prevGameId = useRef(selectedGame?.id);

  if (selectedGame?.id !== prevGameId.current) {
    prevGameId.current = selectedGame?.id;
    setRows(selectedGame ? getLiveRows(selectedGame.id) : []);
  }

  function persist(next) {
    setRows(next);
    if (selectedGame) saveLiveRows(selectedGame.id, next);
  }

  function addRow() { persist([...rows, newRow(rows.length + 1)]); }
  function deleteRow(i) { persist(rows.filter((_, idx) => idx !== i)); }

  function startEdit(ri, col, cur) {
    if (!canEdit) return;
    setEditCell({ row: ri, col });
    setEditVal(cur ?? "");
  }

  function commitEdit() {
    if (!editCell) return;
    persist(rows.map((r, i) =>
      i === editCell.row ? { ...r, [editCell.col]: editVal } : r));
    setEditCell(null);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") setEditCell(null);
  }

  function toggleCol(col) {
    const next = visibleCols.includes(col)
      ? visibleCols.filter(c => c !== col)
      : [...visibleCols, col];
    setVisible(next);
    saveVisibleColumns(next);
  }

  const displayCols = ALL_COLUMNS.filter(c => visibleCols.includes(c));

  return (
    <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column",
      height: "100vh", boxSizing: "border-box" }}>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexShrink: 0 }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Live Tagging
        </h2>
        {selectedGame && (
          <span style={{ color: "var(--text3)", fontSize: 13 }}>
            W{selectedGame.week} — {selectedGame.opponent}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => setColMgr(v => !v)} style={btn("var(--surface2)","var(--text2)")}>
          Columns ({visibleCols.length})
        </button>
        {canEdit && selectedGame && (
          <button onClick={addRow} style={btn(GREEN, "#fff")}>
            + Add Play
          </button>
        )}
      </div>

      {/* Column manager overlay */}
      {showColMgr && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setColMgr(false)}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 20, width: 500, maxHeight: "80vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "var(--text)", margin: 0, fontSize: 15 }}>Manage Columns</h3>
              <button onClick={() => setColMgr(false)}
                style={{ background: "none", border: "none", color: "var(--text3)",
                  cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {ALL_COLUMNS.map(col => (
                <label key={col} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: "var(--text2)", fontSize: 12, cursor: "pointer",
                  padding: "5px 8px", borderRadius: 4,
                  background: visibleCols.includes(col) ? "rgba(92,191,138,.08)" : "transparent",
                }}>
                  <input type="checkbox" checked={visibleCols.includes(col)}
                    onChange={() => toggleCol(col)} style={{ accentColor: ACCENT }} />
                  {col}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedGame ? (
        <div style={emptyBox}>Select a game from the sidebar.</div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12,
            tableLayout: "auto", minWidth: "100%" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr style={{ background: "var(--surface)" }}>
                <th style={thS}>#</th>
                {displayCols.map(col => <th key={col} style={thS}>{col}</th>)}
                {canEdit && <th style={thS} />}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={displayCols.length + 2}
                    style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                    {canEdit
                      ? 'Click "+ Add Play" to start tagging.'
                      : "No plays entered yet."}
                  </td>
                </tr>
              ) : rows.map((row, ri) => (
                <tr key={ri} style={{
                  background: ri % 2 === 0 ? "var(--bg)" : "var(--surface)",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <td style={{ ...tdS, color: "var(--text3)", width: 28, textAlign: "center" }}>
                    {ri + 1}
                  </td>
                  {displayCols.map(col => {
                    const isEditing = editCell?.row === ri && editCell?.col === col;
                    return (
                      <td key={col}
                        style={{ ...tdS, minWidth: 60, maxWidth: 140,
                          cursor: canEdit ? "text" : "default" }}
                        onDoubleClick={() => startEdit(ri, col, row[col])}>
                        {isEditing ? (
                          <input autoFocus value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit} onKeyDown={handleKeyDown}
                            style={{
                              background: "#0a2a18", color: ACCENT,
                              border: `1px solid ${ACCENT}`, borderRadius: 2,
                              padding: "2px 4px", fontSize: 12,
                              width: "100%", boxSizing: "border-box", outline: "none",
                            }} />
                        ) : (
                          <span style={{ color: row[col] ? "var(--text2)" : "var(--text3)" }}>
                            {row[col] || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {canEdit && (
                    <td style={{ ...tdS, width: 28, textAlign: "center" }}>
                      <button onClick={() => deleteRow(ri)} style={{
                        background: "none", border: "none",
                        color: "var(--text3)", cursor: "pointer", fontSize: 13,
                      }}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedGame && rows.length > 0 && (
        <div style={{ color: "var(--text3)", fontSize: 11, paddingTop: 6,
          textAlign: "right", flexShrink: 0 }}>
          {rows.length} play{rows.length !== 1 ? "s" : ""} · Double-click to edit
        </div>
      )}
    </div>
  );
}

const thS = {
  padding: "7px 8px", textAlign: "left", color: "var(--text3)",
  fontWeight: 600, fontSize: 10, textTransform: "uppercase",
  letterSpacing: .5, whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)",
};
const tdS  = { padding: "5px 8px", whiteSpace: "nowrap", verticalAlign: "middle" };
const emptyBox = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 14,
};
function btn(bg, color) {
  return {
    background: bg, color, border: "none", borderRadius: 6,
    padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}
