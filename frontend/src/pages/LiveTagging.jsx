import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { apiSaveLiveRows, apiGetLiveRows } from "../lib/api";
import { buildDownGroup, fpGroupFromYardLine } from "../lib/dataEngine";
import {
  getColumnConfig, saveColumnConfig,
  ALL_COLUMNS,
} from "../lib/storage";

const ACCENT     = "#5CBF8A";
const GREEN      = "#154734";
const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";

function newRow(n) {
  const r = {};
  ALL_COLUMNS.forEach(c => { r[c] = ""; });
  r["PLAY #"] = String(n);
  r["ODK"]    = "O";
  return r;
}

// ── Autocomplete dropdown (rendered inside the td) ───────────────────────────
function SuggestionList({ suggestions, activeIdx, onSelect }) {
  if (!suggestions.length) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 2px)", left: 0, zIndex: 200,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 6, minWidth: 160, maxWidth: 280,
      boxShadow: "0 6px 20px rgba(0,0,0,.45)",
      overflow: "hidden",
    }}>
      {suggestions.map((s, i) => (
        <div
          key={s.value}
          onMouseDown={e => { e.preventDefault(); onSelect(s.value); }}
          style={{
            padding: "6px 10px", cursor: "pointer", fontSize: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            background: i === activeIdx ? "rgba(92,191,138,.18)" : "transparent",
            color:      i === activeIdx ? ACCENT : "var(--text2)",
            borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
          }}>
          <span style={{ fontWeight: i === activeIdx ? 700 : 400 }}>{s.value}</span>
          <span style={{ color: "var(--text3)", fontSize: 10, flexShrink: 0 }}>{s.count}×</span>
        </div>
      ))}
    </div>
  );
}

// ── Memoized cell ─────────────────────────────────────────────────────────────
const Cell = memo(function Cell({
  id, col, isAnchor, isInRange, isEditing, value, editVal,
  canEdit, onClick, onDoubleClick,
  onEditChange, onEditBlur, onEditKeyDown,
  suggestions, activeSuggIdx, onSuggestionSelect,
}) {
  return (
    <td
      id={id}
      style={{
        padding: "4px 8px", whiteSpace: "nowrap", verticalAlign: "middle",
        userSelect: "none", minWidth: 60, maxWidth: 160,
        background: isInRange && !isEditing ? "rgba(92,191,138,.13)" : undefined,
        outline: isAnchor ? `2px solid ${ACCENT}` : isInRange ? `1px solid rgba(92,191,138,.35)` : undefined,
        outlineOffset: -1, position: "relative",
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <>
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
          <SuggestionList
            suggestions={suggestions || []}
            activeIdx={activeSuggIdx ?? -1}
            onSelect={onSuggestionSelect}
          />
        </>
      ) : (
        <span style={{ color: value ? "var(--text2)" : "var(--text3)" }}>
          {value || "—"}
        </span>
      )}
    </td>
  );
});

// ── Memoized row ──────────────────────────────────────────────────────────────
const TableRow = memo(function TableRow({
  row, ri, displayCols, numCols, canEdit,
  anchorR, anchorC, endR, endC,
  editR, editC, editVal,
  editSuggestions, editSuggIdx, onSuggestionSelect,
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
            suggestions={isEditing ? editSuggestions : []}
            activeSuggIdx={isEditing ? editSuggIdx : -1}
            onSuggestionSelect={onSuggestionSelect}
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

// ── Column manager (drag-and-drop) ────────────────────────────────────────────
function ColumnManager({ config, onChange, onClose }) {
  const [local,   setLocal]   = useState(() => ({ ...config }));
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  function toggleCol(col) {
    const vis = local.visible.includes(col)
      ? local.visible.filter(c => c !== col)
      : [...local.visible, col];
    setLocal(l => ({ ...l, visible: vis }));
  }

  function handleDragStart(e, idx) { setDragIdx(idx); e.dataTransfer.effectAllowed = "move"; }
  function handleDragOver(e, idx)  { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverIdx(idx); }
  function handleDrop(e, idx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const order = [...local.order];
    const [moved] = order.splice(dragIdx, 1);
    order.splice(idx, 0, moved);
    setLocal(l => ({ ...l, order }));
    setDragIdx(null); setOverIdx(null);
  }
  function handleDragEnd() { setDragIdx(null); setOverIdx(null); }
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
            style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 10px", flexShrink: 0 }}>
          Check/uncheck to show · Drag ☰ to reorder
        </p>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {local.order.map((col, idx) => (
            <div key={col} draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 4, marginBottom: 2,
                background: overIdx === idx && dragIdx !== idx ? "rgba(92,191,138,.18)"
                  : local.visible.includes(col) ? "rgba(92,191,138,.08)" : "transparent",
                opacity: dragIdx === idx ? 0.4 : 1,
                cursor: "grab",
                borderTop: overIdx === idx && dragIdx !== idx ? `2px solid ${ACCENT}` : "2px solid transparent",
              }}>
              <span style={{ color: "var(--text3)", fontSize: 14, userSelect: "none" }}>☰</span>
              <input type="checkbox" checked={local.visible.includes(col)}
                onChange={() => toggleCol(col)} onClick={e => e.stopPropagation()}
                style={{ accentColor: ACCENT, cursor: "pointer" }} />
              <span style={{ color: "var(--text2)", fontSize: 12, flex: 1, userSelect: "none" }}>{col}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button onClick={apply}
            style={{ ...btnStyle, background: GREEN, color: "#fff", borderColor: GREEN }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LiveTagging() {
  const { selectedGame, liveRows, setLiveRows, liveUpdateCount } = useApp();
  const { user }    = useAuth();
  const canEdit = user?.role === "Admin" || user?.role === "Coach";

  const [rows,       setRows]      = useState([]);
  const [colConfig,  setColConfig] = useState(getColumnConfig);
  const [dotVisible, setDotVisible] = useState(true);
  const [showColMgr, setColMgr]   = useState(false);
  const [sel,        setSel]       = useState(null);   // anchor {r, c}
  const [selEnd,     setSelEnd]    = useState(null);   // range end {r, c}
  const [editCell,   setEditCell]  = useState(null);   // {r, c}
  const [editVal,    setEditVal]   = useState("");
  const [clipboard,  setClipboard] = useState("");
  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);  // [{value, count}]
  const [suggIdx,     setSuggIdx]     = useState(-1);

  const gridRef = useRef(null);
  const localChanges = useRef(false);

  // Live refs
  const selRef         = useRef(sel);
  const selEndRef      = useRef(selEnd);
  const editCellRef    = useRef(editCell);
  const editValRef     = useRef(editVal);
  const rowsRef        = useRef(rows);
  const clipboardRef   = useRef(clipboard);
  const suggestionsRef = useRef(suggestions);
  const suggIdxRef     = useRef(suggIdx);
  selRef.current         = sel;
  selEndRef.current      = selEnd;
  editCellRef.current    = editCell;
  editValRef.current     = editVal;
  rowsRef.current        = rows;
  clipboardRef.current   = clipboard;
  suggestionsRef.current = suggestions;
  suggIdxRef.current     = suggIdx;

  useEffect(() => {
    localChanges.current = false;
    setSel(null); setSelEnd(null); setEditCell(null);
    setSuggestions([]); setSuggIdx(-1);
  }, [selectedGame?.id]);

  // Multi-user sync: if server has more rows than local, append the difference
  useEffect(() => {
    if (!selectedGame) return;
    const poll = () => {
      apiGetLiveRows(selectedGame.id).then(serverRows => {
        setRows(current => {
          if (serverRows.length > current.length) {
            const merged = [...current, ...serverRows.slice(current.length)];
            setLiveRows(merged);
            return merged;
          }
          return current;
        });
      }).catch(() => {});
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [selectedGame?.id, setLiveRows]);

  // Multi-user sync: if server has more rows than local, append the difference
  useEffect(() => {
    if (!selectedGame) return;
    const poll = () => {
      apiGetLiveRows(selectedGame.id).then(serverRows => {
        setRows(current => {
          if (serverRows.length > current.length) {
            const merged = [...current, ...serverRows.slice(current.length)];
            setLiveRows(merged);
            return merged;
          }
          return current;
        });
      }).catch(() => {});
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [selectedGame?.id, setLiveRows]);

  useEffect(() => {
    if (!localChanges.current) setRows(liveRows);
  }, [liveRows]);

  // Flash the live dot when server sends new data
  useEffect(() => {
    if (liveUpdateCount === 0) return;
    setDotVisible(false);
    const t = setTimeout(() => setDotVisible(true), 350);
    return () => clearTimeout(t);
  }, [liveUpdateCount]);

  // Flash the live dot when server sends new data
  useEffect(() => {
    if (liveUpdateCount === 0) return;
    setDotVisible(false);
    const t = setTimeout(() => setDotVisible(true), 350);
    return () => clearTimeout(t);
  }, [liveUpdateCount]);

  const displayCols = colConfig.order.filter(c => colConfig.visible.includes(c));
  const numCols     = displayCols.length;

  // ── Autocomplete: recompute when editVal or editCell changes ─────────────────
  useEffect(() => {
    if (!editCell || !editVal.trim()) {
      setSuggestions([]); setSuggIdx(-1); return;
    }
    const col    = displayCols[editCell.c];
    const prefix = editVal.trim().toUpperCase();
    const freq   = {};
    rowsRef.current.forEach(r => {
      const v = String(r[col] || "").trim().toUpperCase();
      if (v && v !== prefix) freq[v] = (freq[v] || 0) + 1;
    });
    const items = Object.entries(freq)
      .filter(([v]) => v.startsWith(prefix))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([value, count]) => ({ value, count }));
    setSuggestions(items);
    setSuggIdx(-1);
  }, [editVal, editCell?.r, editCell?.c]);

  const saveToServer = useCallback((gameId, data) => {
    apiSaveLiveRows(gameId, data).catch(e => console.warn('saveLiveRows failed:', e));
  }, []);

  const startEdit = useCallback((r, c, initialChar = null) => {
    if (!canEdit) return;
    setSuggestions([]); setSuggIdx(-1);
    setEditCell({ r, c });
    setSel({ r, c });
    setSelEnd(null);
    setEditVal(initialChar !== null ? initialChar.toUpperCase()
      : (rowsRef.current[r]?.[displayCols[c]] ?? ""));
  }, [canEdit, displayCols]);

  const persist = useCallback((next) => {
    localChanges.current = true;
    setRows(next);
    if (selectedGame) { saveToServer(selectedGame.id, next); setLiveRows(next); }
  }, [selectedGame?.id, saveToServer, setLiveRows]);

  const addRow = useCallback(() => {
    const next = [...rowsRef.current, newRow(rowsRef.current.length + 1)];
    localChanges.current = true;
    setRows(next);
    if (selectedGame) { saveToServer(selectedGame.id, next); setLiveRows(next); }
    setTimeout(() => startEdit(next.length - 1, 0), 0);
  }, [selectedGame?.id, saveToServer, setLiveRows, startEdit]);

  const deleteRow = useCallback((ri) => {
    persist(rowsRef.current.filter((_, i) => i !== ri));
    setSel(null); setEditCell(null);
  }, [persist]);

  // commitEdit optionally accepts an override value (for suggestion confirm)
  const commitEdit = useCallback((nextSel, overrideVal) => {
    const curEdit = editCellRef.current;
    const curVal  = overrideVal !== undefined ? overrideVal : editValRef.current;
    if (!curEdit) { if (nextSel) setSel(nextSel); return; }
    editCellRef.current = null;
    const col  = displayCols[curEdit.c];
    const next = rowsRef.current.map((row, i) => {
      if (i !== curEdit.r) return row;
      const updated = { ...row, [col]: curVal };
      if (col === "DN" || col === "DIST") {
        const dg = buildDownGroup(updated["DN"], updated["DIST"]);
        if (dg) updated["DOWN GROUP"] = dg;
      }
      if (col === "YARD LN" && !updated["FP GROUP"]) {
        const fp = fpGroupFromYardLine(curVal);
        if (fp) updated["FP GROUP"] = fp;
      }
      return updated;
    });
    localChanges.current = true;
    setRows(next);
    if (selectedGame) { saveToServer(selectedGame.id, next); setLiveRows(next); }
    setEditCell(null);
    setSuggestions([]); setSuggIdx(-1);
    if (nextSel) setSel(nextSel);
  }, [displayCols, selectedGame?.id, saveToServer, setLiveRows]);

  const cancelEdit = useCallback(() => {
    setEditCell(null); setSuggestions([]); setSuggIdx(-1);
  }, []);

  // ── Hot buttons: directly write to a column in the selected row ──────────────
  const handleHotButton = useCallback((col, value) => {
    const curSel = selRef.current;
    if (!curSel) return;
    // Commit any open edit first
    if (editCellRef.current) commitEdit(null);
    const next = rowsRef.current.map((row, i) => {
      if (i !== curSel.r) return row;
      const updated = { ...row, [col]: value };
      if (col === "DN") {
        const dg = buildDownGroup(value, updated["DIST"]);
        if (dg) updated["DOWN GROUP"] = dg;
      }
      return updated;
    });
    persist(next);
    gridRef.current?.focus();
  }, [commitEdit, persist]);

  const handleCellClick = useCallback((ri, ci, shiftKey) => {
    gridRef.current?.focus();
    // Commit any open edit immediately (blur timeout would also do it, but be explicit)
    if (editCellRef.current) commitEdit(null);
    if (shiftKey && selRef.current) {
      setSelEnd({ r: ri, c: ci });
    } else {
      setSelEnd(null);
      setSel({ r: ri, c: ci });
      // Don't enter edit mode on single click — user types to replace,
      // double-click to edit existing value in-place.
    }
  }, [commitEdit]);

  const handleCellDoubleClick = useCallback((ri, ci) => {
    startEdit(ri, ci);
  }, [startEdit]);

  const handleEditChange = useCallback(e => {
    setEditVal(e.target.value.toUpperCase());
  }, []);

  const handleEditBlur = useCallback(() => {
    // Small delay so suggestion clicks (onMouseDown) fire first
    setTimeout(() => {
      if (editCellRef.current) commitEdit(null);
    }, 80);
  }, [commitEdit]);

  // ── Suggestion select (mouse click or programmatic) ──────────────────────────
  const handleSuggestionSelect = useCallback((value) => {
    editValRef.current = value;       // update ref before commitEdit reads it
    setEditVal(value);
    setSuggestions([]); setSuggIdx(-1);
    setTimeout(() => commitEdit(null), 0);
  }, [commitEdit]);

  // ── Edit key handler ─────────────────────────────────────────────────────────
  const handleEditKeyDown = useCallback((e, ri, ci) => {
    const suggs  = suggestionsRef.current;
    const sIdx   = suggIdxRef.current;
    const hasSug = suggs.length > 0;

    // Suggestion navigation: ↑↓ move through list
    if (hasSug && e.key === "ArrowDown") {
      e.preventDefault();
      setSuggIdx(i => Math.min(i + 1, suggs.length - 1));
      return;
    }
    if (hasSug && e.key === "ArrowUp") {
      e.preventDefault();
      setSuggIdx(i => Math.max(i - 1, -1));
      return;
    }

    // Helper: picks the confirmed suggestion value.
    // - If navigated (sIdx ≥ 0): that suggestion
    // - Otherwise: null → caller uses the typed text as-is
    function pickedVal() {
      if (sIdx >= 0) return suggs[sIdx].value;
      return null;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      if (hasSug) { setSuggestions([]); setSuggIdx(-1); }
      else cancelEdit();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const val = pickedVal();
      if (val) editValRef.current = val;
      setSuggestions([]); setSuggIdx(-1);
      const isLastRow = ri === rowsRef.current.length - 1;
      if (isLastRow && canEdit) {
        commitEdit(null, val ?? undefined);
        const next = [...rowsRef.current, newRow(rowsRef.current.length + 1)];
        localChanges.current = true;
        setRows(next);
        if (selectedGame) { saveToServer(selectedGame.id, next); setLiveRows(next); }
        setTimeout(() => startEdit(next.length - 1, 0), 0);
      } else {
        commitEdit(null, val ?? undefined);
        setTimeout(() => startEdit(ri + 1, ci), 0);
      }
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const val = pickedVal();
      if (val) editValRef.current = val;
      setSuggestions([]); setSuggIdx(-1);
      const nc = e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, numCols - 1);
      commitEdit(null, val ?? undefined);
      setTimeout(() => startEdit(ri, nc), 0);
      return;
    }

    // ArrowRight: accept suggestion (if open) and move right
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (hasSug) {
        const val = pickedVal();
        if (val) editValRef.current = val;
        setSuggestions([]); setSuggIdx(-1);
        commitEdit(null, val ?? undefined);
      } else {
        commitEdit(null);
      }
      setTimeout(() => startEdit(ri, Math.min(ci + 1, numCols - 1)), 0);
      return;
    }

    // Arrow keys commit and move (no suggestions open)
    if (e.key === "ArrowLeft")  { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(ri, Math.max(ci - 1, 0)), 0); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(Math.min(ri + 1, rowsRef.current.length - 1), ci), 0); return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(Math.max(ri - 1, 0), ci), 0); return; }
  }, [cancelEdit, commitEdit, numCols, canEdit, selectedGame?.id, saveToServer, setLiveRows, startEdit]);

  // ── Grid keyboard handler ────────────────────────────────────────────────────
  function handleGridKey(e) {
    const curSel      = selRef.current;
    const curSelEnd   = selEndRef.current;
    const curEditCell = editCellRef.current;
    const curRows     = rowsRef.current;
    if (!curSel) return;
    const { r, c } = curSel;

    if (curEditCell) {
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
      return;
    }

    if (e.shiftKey && ["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const base = curSelEnd ?? curSel;
      let { r: er, c: ec } = base;
      if (e.key === "ArrowRight") ec = Math.min(ec + 1, numCols - 1);
      if (e.key === "ArrowLeft")  ec = Math.max(ec - 1, 0);
      if (e.key === "ArrowDown")  er = Math.min(er + 1, curRows.length - 1);
      if (e.key === "ArrowUp")    er = Math.max(er - 1, 0);
      setSelEnd({ r: er, c: ec });
      return;
    }

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
        persist(curRows.map((row, i) => i === r ? { ...row, [displayCols[c]]: "" } : row));
      }
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
    } else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const lines = text.replace(/\r\n/g, "\n").split("\n");
        const next  = curRows.map((row, ri) => {
          const li = ri - r; if (li < 0 || li >= lines.length) return row;
          const cells = lines[li].split("\t");
          const upd = { ...row };
          cells.forEach((val, ci) => { const col = displayCols[c + ci]; if (col !== undefined) upd[col] = val.toUpperCase(); });
          return upd;
        });
        persist(next);
      }).catch(() => {
        const lines = clipboardRef.current.split("\n");
        const next  = curRows.map((row, ri) => {
          const li = ri - r; if (li < 0 || li >= lines.length) return row;
          const cells = lines[li].split("\t");
          const upd = { ...row };
          cells.forEach((val, ci) => { const col = displayCols[c + ci]; if (col !== undefined) upd[col] = val.toUpperCase(); });
          return upd;
        });
        persist(next);
      });
    } else if (e.key === "Escape") {
      if (curSelEnd) setSelEnd(null); else setSel(null);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault(); setSelEnd(null); startEdit(r, c, e.key);
    }
  }

  function handleColConfigChange(cfg) { setColConfig(cfg); saveColumnConfig(cfg); }

  useEffect(() => {
    if (!sel) return;
    document.getElementById(`cell-${sel.r}-${sel.c}`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  useEffect(() => {
    if (sel && !editCell) gridRef.current?.focus();
  }, [sel?.r, sel?.c, editCell]);

  // Current row values for hot button active state
  const selRow      = sel ? rows[sel.r] : null;
  const selPlayType = String(selRow?.["PLAY TYPE"] || "").trim().toUpperCase();
  const selDn       = String(selRow?.["DN"]        || "").trim();
  const selFpGroup  = String(selRow?.["FP GROUP"]  || "").trim();

  // FP GROUP buttons: [stored value, display label]
  const FP_BUTTONS = [
    ["HIGH REDZONE",    "HIGH RZ"],
    ["LOW REDZONE",     "LOW RZ"],
    ["PLUS TERRITORY",  "+TERR"],
    ["MINUS TERRITORY", "-TERR"],
    ["BACKED UP",       "BACKED UP"],
  ];

  const visibleCount = colConfig.visible.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh",
      padding: "18px 20px", boxSizing: "border-box" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10,
        marginBottom: 10, flexShrink: 0 }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>
          Live Tagging
        </h2>
        {selectedGame && (
          <span style={{ color: "var(--text3)", fontSize: 13 }}>
            W{selectedGame.week} — {selectedGame.opponent}
          </span>
        )}
        {/* Live sync indicator */}
        <span title="Live sync" style={{
          width: 9, height: 9, borderRadius: "50%",
          background: ACCENT,
          display: "inline-block",
          opacity: dotVisible ? 1 : 0,
          transition: "opacity .15s",
          flexShrink: 0,
        }} />
        {/* Live sync indicator */}
        <span title="Live sync" style={{
          width: 9, height: 9, borderRadius: "50%",
          background: ACCENT,
          display: "inline-block",
          opacity: dotVisible ? 1 : 0,
          transition: "opacity .15s",
          flexShrink: 0,
        }} />
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

      {/* ── Hot buttons ── */}
      {canEdit && (
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          marginBottom: 10, flexShrink: 0, flexWrap: "wrap" }}>

          {/* Play Type group */}
          <span style={hotLabelStyle}>Play Type</span>
          {[["RUN", RUN_COLOR, "#fff"], ["PASS", PASS_COLOR, "#fff"], ["RPO", "#D4782A", "#fff"]].map(([v, color, textCol]) => {
            const active = sel && selPlayType === v;
            return (
              <button key={v} onClick={() => handleHotButton("PLAY TYPE", v)}
                disabled={!sel}
                style={{
                  ...hotBtnStyle,
                  background: active ? color : "var(--surface2)",
                  color: active ? textCol : sel ? "var(--text2)" : "var(--text3)",
                  borderColor: active ? color : "var(--border)",
                  opacity: sel ? 1 : 0.45,
                }}>
                {v}
              </button>
            );
          })}

          {/* Divider */}
          <span style={{ width: 1, height: 22, background: "var(--border)", margin: "0 6px" }} />

          {/* Down group */}
          <span style={hotLabelStyle}>Down</span>
          {["1","2","3","4"].map(v => {
            const active = sel && selDn === v;
            return (
              <button key={v} onClick={() => handleHotButton("DN", v)}
                disabled={!sel}
                style={{
                  ...hotBtnStyle,
                  background: active ? ACCENT : "var(--surface2)",
                  color: active ? "#000" : sel ? "var(--text2)" : "var(--text3)",
                  borderColor: active ? ACCENT : "var(--border)",
                  fontWeight: active ? 800 : 600,
                  opacity: sel ? 1 : 0.45,
                }}>
                {v}
              </button>
            );
          })}

          {/* Divider */}
          <span style={{ width: 1, height: 22, background: "var(--border)", margin: "0 6px" }} />

          {/* FP Group */}
          <span style={hotLabelStyle}>FP</span>
          {FP_BUTTONS.map(([value, label]) => {
            const active = sel && selFpGroup === value;
            return (
              <button key={value} onClick={() => handleHotButton("FP GROUP", value)}
                disabled={!sel}
                style={{
                  ...hotBtnStyle,
                  background: active ? "#2a5a3a" : "var(--surface2)",
                  color: active ? ACCENT : sel ? "var(--text2)" : "var(--text3)",
                  borderColor: active ? ACCENT : "var(--border)",
                  fontWeight: active ? 800 : 600,
                  opacity: sel ? 1 : 0.45,
                }}>
                {label}
              </button>
            );
          })}

          {!sel && (
            <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 6 }}>
              Zeile auswählen um Buttons zu aktivieren
            </span>
          )}
        </div>
      )}

      {/* Column manager */}
      {showColMgr && (
        <ColumnManager config={colConfig} onChange={handleColConfigChange}
          onClose={() => setColMgr(false)} />
      )}

      {!selectedGame ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 32, textAlign: "center",
          color: "var(--text3)", fontSize: 14 }}>
          Select a game from the sidebar.
        </div>
      ) : (
        <div ref={gridRef} tabIndex={0} onKeyDown={handleGridKey}
          style={{ flex: 1, overflow: "auto", outline: "none" }}>
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
                  row={row} ri={ri}
                  displayCols={displayCols} numCols={numCols} canEdit={canEdit}
                  anchorR={sel?.r} anchorC={sel?.c}
                  endR={selEnd?.r} endC={selEnd?.c}
                  editR={editCell?.r} editC={editCell?.c} editVal={editVal}
                  editSuggestions={suggestions} editSuggIdx={suggIdx}
                  onSuggestionSelect={handleSuggestionSelect}
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
          Tippe für Autocomplete · Tab/Enter bestätigt · Shift+Click/Arrow = Auswahl · Ctrl+C/V
        </div>
      )}
    </div>
  );
}

const thS = {
  padding: "7px 8px", textAlign: "left", color: "var(--text3)",
  fontWeight: 600, fontSize: 10, textTransform: "uppercase",
  letterSpacing: .5, whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)", userSelect: "none",
};
const btnStyle = {
  background: "var(--surface2)", color: "var(--text2)",
  border: "1px solid var(--border)",
  borderRadius: 6, padding: "7px 13px", fontSize: 12,
  fontWeight: 600, cursor: "pointer",
};
const hotBtnStyle = {
  border: "1px solid var(--border)", borderRadius: 6,
  padding: "5px 12px", fontSize: 12, fontWeight: 700,
  cursor: "pointer", transition: "background .1s, color .1s, border-color .1s",
  letterSpacing: .3,
};
const hotLabelStyle = {
  color: "var(--text3)", fontSize: 11, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: .5,
};
