import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { apiSaveLiveRows } from "../lib/api";
import {
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

// ── Memoized cell component ───────────────────────────────────────────────────
const Cell = memo(function Cell({
  id, isSelected, isEditing, value, editVal,
  canEdit, onClick, onDoubleClick,
  onEditChange, onEditBlur, onEditKeyDown,
}) {
  return (
    <td
      id={id}
      style={{
        padding: "4px 8px", whiteSpace: "nowrap", verticalAlign: "middle",
        userSelect: "none",
        minWidth: 60, maxWidth: 160,
        background: isSelected && !isEditing ? "rgba(92,191,138,.15)" : undefined,
        outline: isSelected ? `2px solid ${ACCENT}` : undefined,
        outlineOffset: -2,
        position: "relative",
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <input
          autoFocus
          value={editVal}
          onChange={onEditChange}
          onBlur={onEditBlur}
          onKeyDown={onEditKeyDown}
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
        <span style={{ color: value ? "var(--text2)" : "var(--text3)" }}>
          {value || "—"}
        </span>
      )}
    </td>
  );
});

// ── Memoized row component ────────────────────────────────────────────────────
const TableRow = memo(function TableRow({
  row, ri, displayCols, numCols, canEdit,
  selR, selC, editR, editC, editVal,
  onCellClick, onCellDoubleClick,
  onEditChange, onEditBlur, onEditKeyDown,
  onDeleteRow,
}) {
  return (
    <tr style={{
      background: ri % 2 === 0 ? "var(--bg)" : "var(--surface)",
      borderBottom: "1px solid var(--border)",
    }}>
      <td style={{ padding: "4px 8px", color: "var(--text3)", width: 28,
        textAlign: "center", userSelect: "none", fontSize: 11 }}>
        {ri + 1}
      </td>

      {displayCols.map((col, ci) => {
        const isSelected = selR === ri && selC === ci;
        const isEditing  = editR === ri && editC === ci;
        return (
          <Cell
            key={col}
            id={`cell-${ri}-${ci}`}
            isSelected={isSelected}
            isEditing={isEditing}
            value={row[col]}
            editVal={isEditing ? editVal : ""}
            canEdit={canEdit}
            onClick={() => onCellClick(ri, ci)}
            onDoubleClick={() => canEdit && onCellDoubleClick(ri, ci)}
            onEditChange={onEditChange}
            onEditBlur={onEditBlur}
            onEditKeyDown={e => onEditKeyDown(e, ri, ci)}
          />
        );
      })}

      {canEdit && (
        <td style={{ padding: "4px 8px", width: 28, textAlign: "center", userSelect: "none" }}>
          <button onClick={() => onDeleteRow(ri)}
            style={{ background: "none", border: "none",
              color: "var(--text3)", cursor: "pointer", fontSize: 12 }}>
            ✕
          </button>
        </td>
      )}
    </tr>
  );
});

// ── Main component ────────────────────────────────────────────────────────────
// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function LiveTagging() {
  const { selectedGame, liveRows }  = useApp();
  const { user }                    = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows,       setRows]      = useState([]);
  const [visCols,    setVisCols]   = useState(getVisibleColumns);
  const [showColMgr, setColMgr]   = useState(false);
  const [sel,        setSel]       = useState(null);  // {r, c}
  const [editCell,   setEditCell]  = useState(null);  // {r, c}
  const [editVal,    setEditVal]   = useState("");
  const [clipboard,  setClipboard] = useState("");
  const gridRef    = useRef(null);
  const prevGameId = useRef(selectedGame?.id);

  // Live refs — always reflect the latest state inside handleGridKey (no stale closures)
  const selRef         = useRef(sel);
  const editCellRef    = useRef(editCell);
  const editValRef     = useRef(editVal);
  const rowsRef        = useRef(rows);
  const clipboardRef   = useRef(clipboard);
  selRef.current       = sel;
  editCellRef.current  = editCell;
  editValRef.current   = editVal;
  rowsRef.current      = rows;
  clipboardRef.current = clipboard;

  // Sync rows when liveRows from context changes (game switch or refresh)
  useEffect(() => {
    prevGameId.current = selectedGame?.id;
    setRows(liveRows);
    setSel(null); setEditCell(null);
  }, [selectedGame?.id, liveRows]);

  const displayCols = ALL_COLUMNS.filter(c => visCols.includes(c));
  const numCols     = displayCols.length;

  const saveToServer = useCallback((gameId, data) => {
    apiSaveLiveRows(gameId, data).catch(e => console.warn('saveLiveRows failed:', e));
  }, []);
  const debouncedSave = useDebounce(saveToServer, 800);

  const persist = useCallback((next) => {
    setRows(next);
    if (selectedGame) debouncedSave(selectedGame.id, next);
  }, [selectedGame?.id, debouncedSave]);

  const addRow = useCallback(() => {
    const next = [...rows, newRow(rows.length + 1)];
    persist(next);
    setSel({ r: next.length - 1, c: 0 });
    setTimeout(() => gridRef.current?.focus(), 0);
  }, [rows, persist]);

  const deleteRow = useCallback((ri) => {
    persist(rows.filter((_, i) => i !== ri));
    setSel(null); setEditCell(null);
  }, [rows, persist]);

  const startEdit = useCallback((r, c, initialChar = null) => {
    if (!canEdit) return;
    setEditCell({ r, c });
    setSel({ r, c });
    setEditVal(initialChar !== null ? initialChar : (rows[r]?.[displayCols[c]] ?? ""));
  }, [canEdit, rows, displayCols]);

  const commitEdit = useCallback((nextSel) => {
    setEditCell(prev => {
      if (!prev) return null;
      const col = displayCols[prev.c];
      setRows(prevRows => {
        const next = prevRows.map((row, i) =>
          i === prev.r ? { ...row, [col]: editVal } : row);
        if (selectedGame) debouncedSave(selectedGame.id, next);
        return next;
      });
      if (nextSel) setSel(nextSel);
      return null;
    });
  }, [displayCols, editVal, selectedGame?.id, debouncedSave]);

  const cancelEdit = useCallback(() => setEditCell(null), []);

  // Cell handlers (stable refs, only change when needed)
  const handleCellClick = useCallback((ri, ci) => {
    gridRef.current?.focus();
    setSel({ r: ri, c: ci });
    setEditCell(null);
  }, []);

  const handleCellDoubleClick = useCallback((ri, ci) => {
    startEdit(ri, ci);
  }, [startEdit]);

  const handleEditChange = useCallback(e => setEditVal(e.target.value), []);

  const handleEditBlur = useCallback(() => {
    commitEdit(null);
  }, [commitEdit]);

  const handleEditKeyDown = useCallback((e, ri, ci) => {
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
    else if (e.key === "Enter") { e.preventDefault(); commitEdit({ r: Math.min(ri + 1, rows.length - 1), c: ci }); }
    else if (e.key === "Tab")   { e.preventDefault(); commitEdit({ r: ri, c: e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, numCols - 1) }); }
  }, [cancelEdit, commitEdit, rows.length, numCols]);

  // Grid keyboard handler — reads from refs to avoid any stale-closure issues
  function handleGridKey(e) {
    const curSel      = selRef.current;
    const curEditCell = editCellRef.current;
    const curRows     = rowsRef.current;
    const curClip     = clipboardRef.current;
    if (!canEdit || !curSel) return;
    const { r, c } = curSel;

    if (curEditCell) {
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); return; }
      if (e.key === "Enter")  { e.preventDefault(); commitEdit({ r: Math.min(r + 1, curRows.length - 1), c }); return; }
      if (e.key === "Tab")    { e.preventDefault(); commitEdit({ r, c: e.shiftKey ? Math.max(c - 1, 0) : Math.min(c + 1, numCols - 1) }); return; }
      return;
    }

    if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault(); setSel({ r, c: Math.min(c + 1, numCols - 1) });
    } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault(); setSel({ r, c: Math.max(c - 1, 0) });
    } else if (e.key === "ArrowDown") {
      e.preventDefault(); setSel({ r: Math.min(r + 1, curRows.length - 1), c });
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setSel({ r: Math.max(r - 1, 0), c });
    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault(); startEdit(r, c);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const col  = displayCols[c];
      const next = curRows.map((row, i) => i === r ? { ...row, [col]: "" } : row);
      persist(next);
    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      setClipboard(curRows[r]?.[displayCols[c]] ?? "");
    } else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const col  = displayCols[c];
      const next = curRows.map((row, i) => i === r ? { ...row, [col]: curClip } : row);
      persist(next);
    } else if (e.key === "Escape") {
      setSel(null);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); startEdit(r, c, e.key);
    }
  }

  function toggleCol(col) {
    const next = visCols.includes(col) ? visCols.filter(c => c !== col) : [...visCols, col];
    setVisCols(next); saveVisibleColumns(next);
  }

  // Scroll selected cell into view
  useEffect(() => {
    if (!sel) return;
    document.getElementById(`cell-${sel.r}-${sel.c}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  // Keep keyboard focus on the grid whenever a cell is selected (not editing)
  // This ensures typing after a single click always triggers handleGridKey
  useEffect(() => {
    if (sel && !editCell) {
      gridRef.current?.focus();
    }
  }, [sel?.r, sel?.c, editCell]);

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
          <button onClick={addRow}
            style={{ ...btnStyle, background: GREEN, color: "#fff", borderColor: GREEN }}>
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
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 32, textAlign: "center",
          color: "var(--text3)", fontSize: 14 }}>
          Select a game from the sidebar.
        </div>
      ) : (
        <div
          ref={gridRef}
          tabIndex={0}
          onKeyDown={handleGridKey}
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
                <TableRow
                  key={ri}
                  row={row}
                  ri={ri}
                  displayCols={displayCols}
                  numCols={numCols}
                  canEdit={canEdit}
                  selR={sel?.r}
                  selC={sel?.c}
                  editR={editCell?.r}
                  editC={editCell?.c}
                  editVal={editVal}
                  onCellClick={handleCellClick}
                  onCellDoubleClick={handleCellDoubleClick}
                  onEditChange={handleEditChange}
                  onEditBlur={handleEditBlur}
                  onEditKeyDown={handleEditKeyDown}
                  onDeleteRow={deleteRow}
                />
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
const btnStyle = {
  background: "var(--surface2)", color: "var(--text2)",
  border: "1px solid var(--border)",
  borderRadius: 6, padding: "7px 13px", fontSize: 12,
  fontWeight: 600, cursor: "pointer",
};
