import { useState, useMemo, useRef, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
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
  const { selectedGame } = useApp();
  const { user }         = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows, setRows]           = useState(() =>
    selectedGame ? getLiveRows(selectedGame.id) : []);
  const [visibleCols, setVisible] = useState(() => getVisibleColumns());
  const [showColMgr, setColMgr]   = useState(false);
  const [editCell, setEditCell]   = useState(null); // {row, col}
  const [editVal,  setEditVal]    = useState("");
  const prevGameId = useRef(selectedGame?.id);

  // Sync rows when game changes
  if (selectedGame?.id !== prevGameId.current) {
    prevGameId.current = selectedGame?.id;
    setRows(selectedGame ? getLiveRows(selectedGame.id) : []);
  }

  function persist(newRows) {
    setRows(newRows);
    if (selectedGame) saveLiveRows(selectedGame.id, newRows);
  }

  function addRow() {
    const nextNum = rows.length + 1;
    persist([...rows, newRow(nextNum)]);
  }

  function deleteRow(idx) {
    persist(rows.filter((_, i) => i !== idx));
  }

  function startEdit(rowIdx, col, curVal) {
    if (!canEdit) return;
    setEditCell({ row: rowIdx, col });
    setEditVal(curVal ?? "");
  }

  function commitEdit() {
    if (!editCell) return;
    const updated = rows.map((r, i) =>
      i === editCell.row ? { ...r, [editCell.col]: editVal } : r);
    persist(updated);
    setEditCell(null);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { setEditCell(null); }
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
    <div style={{ padding: "20px 20px 20px 20px", display: "flex",
      flexDirection: "column", height: "calc(100vh - 0px)", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ color: "#eee", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Live Tagging
        </h2>
        {selectedGame && (
          <span style={{ color: "#555", fontSize: 13 }}>
            W{selectedGame.week} — {selectedGame.opponent}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => setColMgr(v => !v)} style={btnStyle("#222","#ddd")}>
          Spalten ({visibleCols.length})
        </button>
        {canEdit && selectedGame && (
          <button onClick={addRow} style={btnStyle(GREEN, "#fff")}>
            + Play hinzufügen
          </button>
        )}
      </div>

      {/* Column manager overlay */}
      {showColMgr && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,.7)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setColMgr(false)}>
          <div style={{
            background: "#1e1e1e", border: "1px solid #333",
            borderRadius: 10, padding: 20, width: 500, maxHeight: "80vh",
            overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "#eee", margin: 0, fontSize: 15 }}>Spalten verwalten</h3>
              <button onClick={() => setColMgr(false)}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 18 }}>
                ✕
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {ALL_COLUMNS.map(col => (
                <label key={col} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: "#ccc", fontSize: 12, cursor: "pointer",
                  padding: "5px 8px", borderRadius: 4,
                  background: visibleCols.includes(col) ? "rgba(92,191,138,.08)" : "transparent",
                }}>
                  <input type="checkbox" checked={visibleCols.includes(col)}
                    onChange={() => toggleCol(col)}
                    style={{ accentColor: ACCENT }} />
                  {col}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedGame ? (
        <div style={emptyBox}>Wähle ein Spiel aus der Sidebar.</div>
      ) : (
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
          <table style={{
            borderCollapse: "collapse", fontSize: 12,
            tableLayout: "auto", minWidth: "100%",
          }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr style={{ background: "#1e1e1e" }}>
                <th style={thStyle}>#</th>
                {displayCols.map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
                {canEdit && <th style={thStyle}></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={displayCols.length + 2} style={{
                    textAlign: "center", padding: 32, color: "#444",
                  }}>
                    {canEdit
                      ? 'Klicke "+ Play hinzufügen" um zu starten.'
                      : "Noch keine Plays eingetragen."}
                  </td>
                </tr>
              ) : rows.map((row, ri) => (
                <tr key={ri} style={{
                  background: ri % 2 === 0 ? "#111" : "#141414",
                  borderBottom: "1px solid #1e1e1e",
                }}>
                  <td style={{ ...tdStyle, color: "#444", width: 28, textAlign: "center" }}>
                    {ri + 1}
                  </td>
                  {displayCols.map(col => {
                    const isEditing = editCell?.row === ri && editCell?.col === col;
                    return (
                      <td key={col} style={{ ...tdStyle, minWidth: 60, maxWidth: 140,
                        cursor: canEdit ? "text" : "default" }}
                        onDoubleClick={() => startEdit(ri, col, row[col])}>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            style={{
                              background: "#0a2a18", color: "#5CBF8A",
                              border: "1px solid #5CBF8A", borderRadius: 2,
                              padding: "2px 4px", fontSize: 12,
                              width: "100%", boxSizing: "border-box", outline: "none",
                            }}
                          />
                        ) : (
                          <span style={{ color: row[col] ? "#ccc" : "#333" }}>
                            {row[col] || "—"}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {canEdit && (
                    <td style={{ ...tdStyle, width: 28, textAlign: "center" }}>
                      <button onClick={() => deleteRow(ri)} style={{
                        background: "none", border: "none", color: "#444",
                        cursor: "pointer", fontSize: 14, lineHeight: 1,
                      }} title="Play löschen">✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedGame && rows.length > 0 && (
        <div style={{ color: "#444", fontSize: 11, paddingTop: 8, textAlign: "right" }}>
          {rows.length} Play{rows.length !== 1 ? "s" : ""} · Doppelklick zum Bearbeiten
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "7px 8px", textAlign: "left", color: "#666",
  fontWeight: 600, fontSize: 11, textTransform: "uppercase",
  letterSpacing: .5, whiteSpace: "nowrap",
  borderBottom: "1px solid #2a2a2a", background: "#1e1e1e",
};
const tdStyle = { padding: "5px 8px", whiteSpace: "nowrap", verticalAlign: "middle" };
const emptyBox = {
  background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 8, padding: 32, textAlign: "center", color: "#555",
};
function btnStyle(bg, color) {
  return {
    background: bg, color, border: "none", borderRadius: 6,
    padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}
