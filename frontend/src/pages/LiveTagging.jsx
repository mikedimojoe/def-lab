import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { apiSaveLiveRows } from "../lib/api";
import { buildDownGroup } from "../lib/dataEngine";
import {
  getColumnConfig, saveColumnConfig,
  ALL_COLUMNS,
} from "../lib/storage";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

// Columns where we also show the formation as a subtitle
const FORM_HINT_COLS = new Set(["DN", "DIST", "DOWN GROUP"]);

function newRow(n) {
  const r = {};
  ALL_COLUMNS.forEach(c => { r[c] = ""; });
  r["PLAY #"] = String(n);
  return r;
}

// ── Memoized cell component ───────────────────────────────────────────────────
const Cell = memo(function Cell({
  id, col, isSelected, isEditing, value, editVal, subValue,
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
          {subValue && (
            <span style={{ color: "var(--text3)", fontSize: 10, marginLeft: 4, fontStyle: "italic" }}>
              {subValue}
            </span>
          )}
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
        // Show formation as hint in DN/DIST/DOWN GROUP cells
        const subValue = FORM_HINT_COLS.has(col) && row["OFF FORM"]
          ? row["OFF FORM"]
          : undefined;
        return (
          <Cell
            key={col}
            id={`cell-${ri}-${ci}`}
            col={col}
            isSelected={isSelected}
            isEditing={isEditing}
            value={row[col]}
            editVal={isEditing ? editVal : ""}
            subValue={subValue}
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

// ── Column manager modal ──────────────────────────────────────────────────────
function ColumnManager({ config, onChange, onClose }) {
  const [local, setLocal] = useState(() => ({ ...config }));

  function toggleCol(col) {
    const vis = local.visible.includes(col)
      ? local.visible.filter(c => c !== col)
      : [...local.visible, col];
    setLocal(l => ({ ...l, visible: vis }));
  }

  function moveCol(col, dir) {
    const order = [...local.order];
    const idx = order.indexOf(col);
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    setLocal(l => ({ ...l, order }));
  }

  function apply() {
    onChange(local);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: 20, width: 420, maxHeight: "85vh",
        display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 12, flexShrink: 0 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 15 }}>Manage Columns</h3>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text3)",
              cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 10px", flexShrink: 0 }}>
          Check/uncheck to show · ↑↓ to reorder
        </p>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {local.order.map((col, idx) => (
            <div key={col} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 8px", borderRadius: 4, marginBottom: 2,
              background: local.visible.includes(col)
                ? "rgba(92,191,138,.08)" : "transparent",
            }}>
              <input type="checkbox" checked={local.visible.includes(col)}
                onChange={() => toggleCol(col)}
                style={{ accentColor: ACCENT, flexShrink: 0 }} />
              <span style={{ color: "var(--text2)", fontSize: 12, flex: 1 }}>{col}</span>
              <button onClick={() => moveCol(col, -1)} disabled={idx === 0}
                style={{ background: "none", border: "none", color: "var(--text3)",
                  cursor: idx === 0 ? "default" : "pointer", fontSize: 12, padding: "0 4px",
                  opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
              <button onClick={() => moveCol(col, 1)} disabled={idx === local.order.length - 1}
                style={{ background: "none", border: "none", color: "var(--text3)",
                  cursor: idx === local.order.length - 1 ? "default" : "pointer",
                  fontSize: 12, padding: "0 4px",
                  opacity: idx === local.order.length - 1 ? 0.3 : 1 }}>↓</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8,
          marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ ...btnStyle }}>Cancel</button>
          <button onClick={apply}
            style={{ ...btnStyle, background: GREEN, color: "#fff", borderColor: GREEN }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LiveTagging() {
  const { selectedGame, liveRows }  = useApp();
  const { user }                    = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows,       setRows]      = useState([]);
  const [colConfig,  setColConfig] = useState(getColumnConfig);
  const [showColMgr, setColMgr]   = useState(false);
  const [sel,        setSel]       = useState(null);  // {r, c}
  const [editCell,   setEditCell]  = useState(null);  // {r, c}
  const [editVal,    setEditVal]   = useState("");
  const [clipboard,  setClipboard] = useState("");
  const gridRef    = useRef(null);

  // Track whether local unsaved changes exist → prevents overwriting from context
  const localChanges = useRef(false);

  // Live refs — always reflect latest state in handleGridKey (no stale closures)
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

  // Reset local-changes flag when game changes
  useEffect(() => {
    localChanges.current = false;
    setSel(null); setEditCell(null);
  }, [selectedGame?.id]);

  // Sync rows from context — only if no local changes have been made
  useEffect(() => {
    if (!localChanges.current) {
      setRows(liveRows);
    }
  }, [liveRows]);

  const displayCols = colConfig.order.filter(c => colConfig.visible.includes(c));
  const numCols     = displayCols.length;

  const saveToServer = useCallback((gameId, data) => {
    apiSaveLiveRows(gameId, data).catch(e => console.warn('saveLiveRows failed:', e));
  }, []);

  // Persist immediately — no debounce so every committed cell/row is saved right away
  const persist = useCallback((next) => {
    localChanges.current = true;
    setRows(next);
    if (selectedGame) saveToServer(selectedGame.id, next);
  }, [selectedGame?.id, saveToServer]);

  const addRow = useCallback(() => {
    setRows(prevRows => {
      const next = [...prevRows, newRow(prevRows.length + 1)];
      localChanges.current = true;
      if (selectedGame) saveToServer(selectedGame.id, next);
      setSel({ r: next.length - 1, c: 0 });
      setTimeout(() => gridRef.current?.focus(), 0);
      return next;
    });
  }, [selectedGame?.id, saveToServer]);

  const deleteRow = useCallback((ri) => {
    persist(rowsRef.current.filter((_, i) => i !== ri));
    setSel(null); setEditCell(null);
  }, [persist]);

  const startEdit = useCallback((r, c, initialChar = null) => {
    if (!canEdit) return;
    setEditCell({ r, c });
    setSel({ r, c });
    setEditVal(initialChar !== null ? initialChar : (rowsRef.current[r]?.[displayCols[c]] ?? ""));
  }, [canEdit, displayCols]);

  const commitEdit = useCallback((nextSel) => {
    const curEdit = editCellRef.current;
    const curVal  = editValRef.current;
    if (!curEdit) { if (nextSel) setSel(nextSel); return; }
    // Clear ref immediately so blur (which fires after arrow keys) doesn't double-commit
    editCellRef.current = null;
    const col = displayCols[curEdit.c];
    setRows(prevRows => {
      const next = prevRows.map((row, i) => {
        if (i !== curEdit.r) return row;
        const updated = { ...row, [col]: curVal };
        // Auto-fill DOWN GROUP when DN or DIST is edited
        if ((col === "DN" || col === "DIST") && !updated["DOWN GROUP"]) {
          const dg = buildDownGroup(updated["DN"], updated["DIST"]);
          if (dg) updated["DOWN GROUP"] = dg;
        }
        return updated;
      });
      if (selectedGame) saveToServer(selectedGame.id, next);
      localChanges.current = true;
      return next;
    });
    setEditCell(null);
    if (nextSel) setSel(nextSel);
  }, [displayCols, selectedGame?.id, saveToServer]);

  const cancelEdit = useCallback(() => setEditCell(null), []);

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

  // Arrow keys while editing → commit and move (like Google Sheets)
  const handleEditKeyDown = useCallback((e, ri, ci) => {
    if (e.key === "Escape")      { e.preventDefault(); cancelEdit(); }
    else if (e.key === "Enter")  { e.preventDefault(); commitEdit({ r: Math.min(ri + 1, rowsRef.current.length - 1), c: ci }); }
    else if (e.key === "Tab")    { e.preventDefault(); commitEdit({ r: ri, c: e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, numCols - 1) }); }
    else if (e.key === "ArrowRight") { e.preventDefault(); commitEdit({ r: ri, c: Math.min(ci + 1, numCols - 1) }); }
    else if (e.key === "ArrowLeft")  { e.preventDefault(); commitEdit({ r: ri, c: Math.max(ci - 1, 0) }); }
    else if (e.key === "ArrowDown")  { e.preventDefault(); commitEdit({ r: Math.min(ri + 1, rowsRef.current.length - 1), c: ci }); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); commitEdit({ r: Math.max(ri - 1, 0), c: ci }); }
  }, [cancelEdit, commitEdit, numCols]);

  // Grid keyboard handler — reads from refs to avoid stale-closure issues
  function handleGridKey(e) {
    const curSel      = selRef.current;
    const curEditCell = editCellRef.current;
    const curRows     = rowsRef.current;
    const curClip     = clipboardRef.current;
    if (!canEdit || !curSel) return;
    const { r, c } = curSel;

    if (curEditCell) {
      // Arrow keys handled inside the input via handleEditKeyDown
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
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

  function handleColConfigChange(cfg) {
    setColConfig(cfg);
    saveColumnConfig(cfg);
  }

  // Scroll selected cell into view
  useEffect(() => {
    if (!sel) return;
    document.getElementById(`cell-${sel.r}-${sel.c}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  // Keep keyboard focus on the grid when a cell is selected (not editing)
  useEffect(() => {
    if (sel && !editCell) {
      gridRef.current?.focus();
    }
  }, [sel?.r, sel?.c, editCell]);

  const visibleCount = colConfig.visible.length;

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
          Columns ({visibleCount})
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
        <ColumnManager
          config={colConfig}
          onChange={handleColConfigChange}
          onClose={() => setColMgr(false)}
        />
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
          Click to select · Double-click or type to edit ·
          Arrows/Tab/Enter to navigate · Del to clear · Ctrl+C/V to copy/paste
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
