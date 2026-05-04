import { useState, useRef, useCallback, useEffect, memo, Fragment } from "react";
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

// (Formation hint removed from cells — shown in Overview instead)

function newRow(n) {
  const r = {};
  ALL_COLUMNS.forEach(c => { r[c] = ""; });
  r["PLAY #"] = String(n);
  r["ODK"]    = "O";
  return r;
}

// ── Memoized cell component ───────────────────────────────────────────────────
const Cell = memo(function Cell({
  id, col, isAnchor, isInRange, isEditing, value, editVal,
  canEdit, onClick, onDoubleClick,
  onEditChange, onEditBlur, onEditKeyDown,
}) {
  return (
    <td
      id={id}
      style={{
        padding: "4px 8px", whiteSpace: "nowrap", verticalAlign: "middle",
        userSelect: "none", minWidth: 60, maxWidth: 160,
        background: isInRange && !isEditing ? "rgba(92,191,138,.13)" : undefined,
        outline: isAnchor ? `2px solid ${ACCENT}` : isInRange ? `1px solid rgba(92,191,138,.35)` : undefined,
        outlineOffset: -1,
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
  anchorR, anchorC, endR, endC,
  editR, editC, editVal,
  onCellClick, onCellDoubleClick,
  onEditChange, onEditBlur, onEditKeyDown,
  onDeleteRow,
}) {
  const r1 = Math.min(anchorR ?? ri, endR ?? anchorR ?? ri);
  const r2 = Math.max(anchorR ?? ri, endR ?? anchorR ?? ri);
  const c1 = Math.min(anchorC ?? 0, endC ?? anchorC ?? 0);
  const c2 = Math.max(anchorC ?? 0, endC ?? anchorC ?? 0);

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
        const isInRange = anchorR != null && ri >= r1 && ri <= r2 && ci >= c1 && ci <= c2;
        const isAnchor  = ri === anchorR && ci === anchorC;
        const isEditing = editR === ri && editC === ci;
        return (
          <Cell
            key={col}
            id={`cell-${ri}-${ci}`}
            col={col}
            isAnchor={isAnchor}
            isInRange={isInRange}
            isEditing={isEditing}
            value={row[col]}
            editVal={isEditing ? editVal : ""}
            canEdit={canEdit}
            onClick={e => onCellClick(ri, ci, e.shiftKey)}
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

// ── Column manager modal (drag-and-drop reorder) ──────────────────────────────
function ColumnManager({ config, onChange, onClose }) {
  const [local,    setLocal]    = useState(() => ({ ...config }));
  const [dragIdx,  setDragIdx]  = useState(null);
  const [overIdx,  setOverIdx]  = useState(null);

  function toggleCol(col) {
    const vis = local.visible.includes(col)
      ? local.visible.filter(c => c !== col)
      : [...local.visible, col];
    setLocal(l => ({ ...l, visible: vis }));
  }

  function handleDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }

  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const order = [...local.order];
    const [moved] = order.splice(dragIdx, 1);
    order.splice(idx, 0, moved);
    setLocal(l => ({ ...l, order }));
    setDragIdx(null);
    setOverIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
  }

  function apply() { onChange(local); onClose(); }

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
          Check/uncheck to show · Drag ☰ to reorder
        </p>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {local.order.map((col, idx) => (
            <div key={col}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 4, marginBottom: 2,
                background: overIdx === idx && dragIdx !== idx
                  ? "rgba(92,191,138,.18)"
                  : local.visible.includes(col)
                    ? "rgba(92,191,138,.08)" : "transparent",
                opacity: dragIdx === idx ? 0.4 : 1,
                cursor: "grab",
                borderTop: overIdx === idx && dragIdx !== idx
                  ? `2px solid ${ACCENT}` : "2px solid transparent",
                transition: "background .1s",
              }}>
              <span style={{ color: "var(--text3)", fontSize: 14, cursor: "grab",
                userSelect: "none", flexShrink: 0 }}>☰</span>
              <input type="checkbox" checked={local.visible.includes(col)}
                onChange={() => toggleCol(col)}
                onClick={e => e.stopPropagation()}
                style={{ accentColor: ACCENT, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ color: "var(--text2)", fontSize: 12, flex: 1,
                userSelect: "none" }}>{col}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8,
          marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ ...btnStyle }}>Cancel</button>
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
  const { selectedGame, liveRows, setLiveRows } = useApp();
  const { user }                    = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows,       setRows]      = useState([]);
  const [colConfig,  setColConfig] = useState(getColumnConfig);
  const [showColMgr, setColMgr]   = useState(false);
  const [sel,        setSel]       = useState(null);   // anchor {r, c}
  const [selEnd,     setSelEnd]    = useState(null);   // range end {r, c}
  const [editCell,   setEditCell]  = useState(null);   // {r, c}
  const [editVal,    setEditVal]   = useState("");
  const [clipboard,  setClipboard] = useState("");
  const gridRef    = useRef(null);

  // Track whether local unsaved changes exist → prevents overwriting from context
  const localChanges = useRef(false);

  // Live refs — always reflect latest state in handleGridKey (no stale closures)
  const selRef         = useRef(sel);
  const selEndRef      = useRef(selEnd);
  const editCellRef    = useRef(editCell);
  const editValRef     = useRef(editVal);
  const rowsRef        = useRef(rows);
  const clipboardRef   = useRef(clipboard);
  selRef.current       = sel;
  selEndRef.current    = selEnd;
  editCellRef.current  = editCell;
  editValRef.current   = editVal;
  rowsRef.current      = rows;
  clipboardRef.current = clipboard;

  // Reset local-changes flag when game changes
  useEffect(() => {
    localChanges.current = false;
    setSel(null); setSelEnd(null); setEditCell(null);
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

  // startEdit must be declared before addRow (dependency order)
  const startEdit = useCallback((r, c, initialChar = null) => {
    if (!canEdit) return;
    setEditCell({ r, c });
    setSel({ r, c });
    setSelEnd(null);  // always clear range on explicit edit
    setEditVal(initialChar !== null ? initialChar.toUpperCase() : (rowsRef.current[r]?.[displayCols[c]] ?? ""));
  }, [canEdit, displayCols]);

  // Persist immediately — saves to server AND syncs back to AppContext
  const persist = useCallback((next) => {
    localChanges.current = true;
    setRows(next);
    if (selectedGame) {
      saveToServer(selectedGame.id, next);
      setLiveRows(next);
    }
  }, [selectedGame?.id, saveToServer, setLiveRows]);

  const addRow = useCallback(() => {
    const next = [...rowsRef.current, newRow(rowsRef.current.length + 1)];
    localChanges.current = true;
    setRows(next);
    if (selectedGame) {
      saveToServer(selectedGame.id, next);
      setLiveRows(next);
    }
    setTimeout(() => startEdit(next.length - 1, 0), 0);
  }, [selectedGame?.id, saveToServer, setLiveRows, startEdit]);

  const deleteRow = useCallback((ri) => {
    persist(rowsRef.current.filter((_, i) => i !== ri));
    setSel(null); setEditCell(null);
  }, [persist]);

  const commitEdit = useCallback((nextSel) => {
    const curEdit = editCellRef.current;
    const curVal  = editValRef.current;
    if (!curEdit) { if (nextSel) setSel(nextSel); return; }
    // Clear ref immediately so blur (which fires after arrow keys) doesn't double-commit
    editCellRef.current = null;
    const col  = displayCols[curEdit.c];
    const next = rowsRef.current.map((row, i) => {
      if (i !== curEdit.r) return row;
      const updated = { ...row, [col]: curVal };
      // Auto-fill DOWN GROUP when DN or DIST is edited
      if ((col === "DN" || col === "DIST") && !updated["DOWN GROUP"]) {
        const dg = buildDownGroup(updated["DN"], updated["DIST"]);
        if (dg) updated["DOWN GROUP"] = dg;
      }
      return updated;
    });
    localChanges.current = true;
    setRows(next);
    if (selectedGame) {
      saveToServer(selectedGame.id, next);
      setLiveRows(next);
    }
    setEditCell(null);
    if (nextSel) setSel(nextSel);
  }, [displayCols, selectedGame?.id, saveToServer, setLiveRows]);

  const cancelEdit = useCallback(() => setEditCell(null), []);

  const handleCellClick = useCallback((ri, ci, shiftKey) => {
    gridRef.current?.focus();
    if (shiftKey && selRef.current) {
      // Extend selection range without starting edit
      commitEdit(null);
      setSelEnd({ r: ri, c: ci });
    } else {
      // Normal click: select & edit, clear any range
      setSelEnd(null);
      startEdit(ri, ci);
    }
  }, [startEdit, commitEdit]);

  const handleCellDoubleClick = useCallback((ri, ci) => {
    startEdit(ri, ci);
  }, [startEdit]);

  const handleEditChange = useCallback(e => setEditVal(e.target.value.toUpperCase()), []);

  const handleEditBlur = useCallback(() => {
    commitEdit(null);
  }, [commitEdit]);

  // Arrow keys while editing → commit and move (like Google Sheets)
  const handleEditKeyDown = useCallback((e, ri, ci) => {
    if (e.key === "Escape")      { e.preventDefault(); cancelEdit(); }
    else if (e.key === "Enter")  {
      e.preventDefault();
      const isLastRow = ri === rowsRef.current.length - 1;
      if (isLastRow && canEdit) {
        // commit current cell, add new row, open first cell of new row
        commitEdit(null);
        const next = [...rowsRef.current, newRow(rowsRef.current.length + 1)];
        localChanges.current = true;
        setRows(next);
        if (selectedGame) { saveToServer(selectedGame.id, next); setLiveRows(next); }
        setTimeout(() => startEdit(next.length - 1, 0), 0);
      } else {
        // commit and immediately open next row's same column
        commitEdit(null);
        setTimeout(() => startEdit(ri + 1, ci), 0);
      }
    }
    else if (e.key === "Tab") {
      e.preventDefault();
      const nc = e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, numCols - 1);
      commitEdit(null); setTimeout(() => startEdit(ri, nc), 0);
    }
    else if (e.key === "ArrowRight") { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(ri, Math.min(ci + 1, numCols - 1)), 0); }
    else if (e.key === "ArrowLeft")  { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(ri, Math.max(ci - 1, 0)), 0); }
    else if (e.key === "ArrowDown")  { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(Math.min(ri + 1, rowsRef.current.length - 1), ci), 0); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(Math.max(ri - 1, 0), ci), 0); }
  }, [cancelEdit, commitEdit, numCols]);

  // Grid keyboard handler — reads from refs to avoid stale-closure issues
  function handleGridKey(e) {
    const curSel      = selRef.current;
    const curSelEnd   = selEndRef.current;
    const curEditCell = editCellRef.current;
    const curRows     = rowsRef.current;

    if (!curSel) return;
    const { r, c } = curSel;

    if (curEditCell) {
      // Arrow keys handled inside the input via handleEditKeyDown
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
      return;
    }

    // ── Shift+Arrow: extend selection range ───────────────────────────────────
    if (e.shiftKey && ["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const base = curSelEnd ?? curSel;  // extend from selEnd if already ranging
      let { r: er, c: ec } = base;
      if (e.key === "ArrowRight") ec = Math.min(ec + 1, numCols - 1);
      if (e.key === "ArrowLeft")  ec = Math.max(ec - 1, 0);
      if (e.key === "ArrowDown")  er = Math.min(er + 1, curRows.length - 1);
      if (e.key === "ArrowUp")    er = Math.max(er - 1, 0);
      setSelEnd({ r: er, c: ec });
      return;
    }

    // ── Plain Arrow / Tab: move anchor, clear range ───────────────────────────
    if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault(); setSelEnd(null); setSel({ r, c: Math.min(c + 1, numCols - 1) });
    } else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault(); setSelEnd(null); setSel({ r, c: Math.max(c - 1, 0) });
    } else if (e.key === "ArrowDown") {
      e.preventDefault(); setSelEnd(null); setSel({ r: Math.min(r + 1, curRows.length - 1), c });
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setSelEnd(null); setSel({ r: Math.max(r - 1, 0), c });

    } else if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault(); setSelEnd(null); startEdit(r, c);

    // ── Delete / Backspace: clear all cells in range ──────────────────────────
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (curSelEnd) {
        const r1 = Math.min(r, curSelEnd.r), r2 = Math.max(r, curSelEnd.r);
        const c1 = Math.min(c, curSelEnd.c), c2 = Math.max(c, curSelEnd.c);
        const next = curRows.map((row, ri) => {
          if (ri < r1 || ri > r2) return row;
          const upd = { ...row };
          for (let ci = c1; ci <= c2; ci++) upd[displayCols[ci]] = "";
          return upd;
        });
        persist(next);
      } else {
        const col  = displayCols[c];
        const next = curRows.map((row, i) => i === r ? { ...row, [col]: "" } : row);
        persist(next);
      }

    // ── Ctrl+C: copy range as TSV ─────────────────────────────────────────────
    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      const r1 = curSelEnd ? Math.min(r, curSelEnd.r) : r;
      const r2 = curSelEnd ? Math.max(r, curSelEnd.r) : r;
      const c1 = curSelEnd ? Math.min(c, curSelEnd.c) : c;
      const c2 = curSelEnd ? Math.max(c, curSelEnd.c) : c;
      const tsv = curRows.slice(r1, r2 + 1).map(row =>
        displayCols.slice(c1, c2 + 1).map(col => row[col] ?? "").join("\t")
      ).join("\n");
      setClipboard(tsv);
      navigator.clipboard.writeText(tsv).catch(() => {});

    // ── Ctrl+V: paste TSV starting at anchor ─────────────────────────────────
    } else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const lines = text.replace(/\r\n/g, "\n").split("\n");
        const next  = curRows.map((row, ri) => {
          const lineIdx = ri - r;
          if (lineIdx < 0 || lineIdx >= lines.length) return row;
          const cells = lines[lineIdx].split("\t");
          const upd   = { ...row };
          cells.forEach((val, ci) => {
            const col = displayCols[c + ci];
            if (col !== undefined) upd[col] = val.toUpperCase();
          });
          return upd;
        });
        persist(next);
      }).catch(() => {
        // browser blocked clipboard access — fall back to internal clipboard
        const tsv   = clipboardRef.current;
        const lines = tsv.split("\n");
        const next  = curRows.map((row, ri) => {
          const lineIdx = ri - r;
          if (lineIdx < 0 || lineIdx >= lines.length) return row;
          const cells = lines[lineIdx].split("\t");
          const upd   = { ...row };
          cells.forEach((val, ci) => {
            const col = displayCols[c + ci];
            if (col !== undefined) upd[col] = val.toUpperCase();
          });
          return upd;
        });
        persist(next);
      });

    } else if (e.key === "Escape") {
      if (curSelEnd) { setSelEnd(null); }
      else           { setSel(null); }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); setSelEnd(null); startEdit(r, c, e.key);
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
                  anchorR={sel?.r}
                  anchorC={sel?.c}
                  endR={selEnd?.r}
                  endC={selEnd?.c}
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
          Click to edit · Shift+Click/Arrow to select range · Ctrl+C copy · Ctrl+V paste · Del to clear · Enter = next row
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
