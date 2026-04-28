import { useState, useRef, useCallback, useEffect } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import {
  getLiveRows, saveLiveRows,
  getVisibleColumns, saveVisibleColumns,
  ALL_COLUMNS,
} from "../lib/storage";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

function newRow(n) {
  const r = {};
  ALL_COLUMNS.forEach(c => { r[c] = ""; });
  r["PLAY #"] = String(n);
  return r;
}

export default function LiveTagging() {
  const { selectedGame }        = useApp();
  const { user }                = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows,       setRows]      = useState(() => selectedGame ? getLiveRows(selectedGame.id) : []);
  const [visCols,    setVisCols]   = useState(getVisibleColumns);
  const [showColMgr, setColMgr]   = useState(false);
  // selectedCell = {r, c}  — keyboard-focused cell (not editing)
  // editCell     = {r, c}  — actively editing cell (text input shown)
  const [sel,        setSel]       = useState(null);
  const [editCell,   setEditCell]  = useState(null);
  const [editVal,    setEditVal]   = useState("");
  const [clipboard,  setClipboard] = useState("");
  const gridRef = useRef(null);
  const prevGameId = useRef(selectedGame?.id);

  // Sync rows when game changes
  if (selectedGame?.id !== prevGameId.current) {
    prevGameId.current = selectedGame?.id;
    setRows(selectedGame ? getLiveRows(selectedGame.id) : []);
    setSel(null); setEditCell(null);
  }

  const displayCols = ALL_COLUMNS.filter(c => visCols.includes(c));
  const numCols     = displayCols.length;

  function persist(next) {
    setRows(next);
    if (selectedGame) saveLiveRows(selectedGame.id, next);
  }

  function addRow() {
    const next = [...rows, newRow(rows.length + 1)];
    persist(next);
    // Auto-select first column of new row
    setSel({ r: next.length - 1, c: 0 });
    setTimeout(() => gridRef.current?.focus(), 0);
  }

  function deleteRow(ri) {
    persist(rows.filter((_, i) => i !== ri));
    setSel(null); setEditCell(null);
  }

  // ── Cell editing ────────────────────────────────────────────────────────────
  function startEdit(r, c, initialChar = null) {
    if (!canEdit) return;
    setEditCell({ r, c });
    setSel({ r, c });
    setEditVal(initialChar !== null ? initialChar : (rows[r]?.[displayCols[c]] ?? ""));
  }

  function commitEdit(nextSel) {
    if (!editCell) return;
    const col = displayCols[editCell.c];
    const next = rows.map((row, i) =>
      i === editCell.r ? { ...row, [col]: editVal } : row);
    persist(next);
    setEditCell(null);
    if (nextSel) setSel(nextSel);
  }

  function cancelEdit() {
    setEditCell(null);
  }

  // ── Grid keyboard handler ───────────────────────────────────────────────────
  function handleGridKey(e) {
    if (!canEdit || !sel) return;
    const { r, c } = sel;

    if (editCell) {
      // ── In-cell editing keys ────────────────────────────────────────────────
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); return; }
      if (e.key === "Enter")  { e.preventDefault(); commitEdit({ r: Math.min(r + 1, rows.length - 1), c }); return; }
      if (e.key === "Tab")    { e.preventDefault(); commitEdit({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, numCols - 1) }); return; }
      return; // let other keys go to the input
    }

    // ── Navigation mode ─────────────────────────────────────────────────────
    if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      setSel({ r, c: Math.min(c + 1, numCols - 1) });
    } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault();
      setSel({ r, c: Math.max(c - 1, 0) });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel({ r: Math.min(r + 1, rows.length - 1), c });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel({ r: Math.max(r - 1, 0), c });
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      startEdit(r, c);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const col  = displayCols[c];
      const next = rows.map((row, i) => i === r ? { ...row, [col]: "" } : row);
      persist(next);
    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      // Copy
      setClipboard(rows[r]?.[displayCols[c]] ?? "");
    } else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const col  = displayCols[c];
      const next = rows.map((row, i) => i === r ? { ...row, [col]: clipboard } : row);
      persist(next);
    } else if (e.key === "Escape") {
      setSel(null);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Start typing → enter edit mode with typed char
      e.preventDefault();
      startEdit(r, c, e.key);
    }
  }

  function toggleCol(col) {
    const next = visCols.includes(col)
      ? visCols.filter(c => c !== col)
      : [...visCols, col];
    setVisCols(next);
    saveVisibleColumns(next);
  }

  // Scroll selected cell into view
  useEffect(() => {
    if (!sel) return;
    const el = document.getElementById(`cell-${sel.r}-${sel.c}`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh",
      padding: "18px 20px", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10,
        marginBottom: 12, flexShrink: 0 }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Live Tagging
        </h2>
        {selectedGame && (
          <span style={{ color: "var(--text3)", fontSize: 13 }}>
            W{selectedGame.week} — {selectedGame.opponent}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => setColMgr(v => !v)} style={btnStyle}>
          Columns ({visCols.length})
        </button>
        {canEdit && selectedGame && (
          <button onClick={addRow} style={{ ...btnStyle, background: GREEN, color: "#fff" }}>
            + Add Play
          </button>
        )}
      </div>

      {/* Column manager */}
      {showColMgr && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
          zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setColMgr(false)}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 20, width: 500, maxHeight: "80vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ color: "var(--text)", margin: 0, fontSize: 15 }}>Manage Columns</h3>
              <button onClick={() => setColMgr(false)}
                style={{ background: "none", border: "none",
                  color: "var(--text3)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {ALL_COLUMNS.map(col => (
                <label key={col} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: "var(--text2)", fontSize: 12, cursor: "pointer",
                  padding: "5px 8px", borderRadius: 4,
                  background: visCols.includes(col) ? "rgba(92,191,138,.08)" : "transparent",
                }}>
                  <input type="checkbox" checked={visCols.includes(col)}
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
        /* Grid container — captures all keyboard events */
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={handleGridKey}
          onFocus={() => {}}
          style={{ flex: 1, overflow: "auto", outline: "none" }}
        >
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
                  <td colSpan={numCols + 2}
                    style={{ textAlign: "center", padding: 32, color: "var(--text3)" }}>
                    {canEdit
                      ? 'Click "+ Add Play" to start, or press any key after selecting a cell.'
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

                  {displayCols.map((col, ci) => {
                    const isSelected = sel?.r === ri && sel?.c === ci;
                    const isEditing  = editCell?.r === ri && editCell?.c === ci;

                    return (
                      <td
                        id={`cell-${ri}-${ci}`}
                        key={col}
                        style={{
                          ...tdS,
                          minWidth: 60, maxWidth: 140,
                          cursor: canEdit ? "default" : "default",
                          background: isSelected && !isEditing
                            ? "rgba(92,191,138,.15)"
                            : undefined,
                          outline: isSelected ? `2px solid ${ACCENT}` : undefined,
                          outlineOffset: -2,
                          position: "relative",
                        }}
                        onClick={() => {
                          gridRef.current?.focus();
                          setSel({ r: ri, c: ci });
                          setEditCell(null);
                        }}
                        onDoubleClick={() => canEdit && startEdit(ri, ci)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={() => commitEdit(sel)}
                            onKeyDown={e => {
                              if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
                              else if (e.key === "Enter") { e.preventDefault(); commitEdit({ r: Math.min(ri + 1, rows.length - 1), c: ci }); }
                              else if (e.key === "Tab")   { e.preventDefault(); commitEdit({ r: ri, c: e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, numCols - 1) }); }
                            }}
                            style={{
                              background: "#0a2a18", color: ACCENT,
                              border: `1px solid ${ACCENT}`, borderRadius: 2,
                              padding: "2px 4px", fontSize: 12,
                              width: "100%", boxSizing: "border-box", outline: "none",
                              position: "absolute", top: 2, left: 2, right: 2, bottom: 2,
                              zIndex: 5,
                            }}
                          />
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
                        color: "var(--text3)", cursor: "pointer", fontSize: 12,
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
        <div style={{ color: "var(--text3)", fontSize: 10, paddingTop: 6,
          textAlign: "right", flexShrink: 0 }}>
          {rows.length} play{rows.length !== 1 ? "s" : ""} ·
          Click to select · Double-click or type to edit · Tab/Arrows to navigate ·
          Del to clear · Ctrl+C/V to copy/paste
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
  userSelect: "none",
};
const tdS = {
  padding: "4px 8px", whiteSpace: "nowrap", verticalAlign: "middle",
  userSelect: "none",
};
const emptyBox = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 8, padding: 32, textAlign: "center",
  color: "var(--text3)", fontSize: 14,
};
const btnStyle = {
  background: "var(--surface2)", color: "var(--text2)", border: "none",
  borderRadius: 6, padding: "7px 13px", fontSize: 12,
  fontWeight: 600, cursor: "pointer",
};
