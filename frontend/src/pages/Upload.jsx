import { useState, useRef, useCallback, useEffect, memo, useMemo } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import {
  apiGetPlays, apiSavePlays, apiSaveRoster, apiGetRoster,
  apiUploadImage, apiGetImages, apiDeleteImage,
} from "../lib/api";
import { parsePlaylistData } from "../lib/xlsxParser";
import { buildDownGroup, fpGroupFromYardLine, filterAnalyticsRows } from "../lib/dataEngine";
import { getColumnConfig, saveColumnConfig, ALL_COLUMNS } from "../lib/storage";
import * as XLSX from "xlsx";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

// ── Auto-fill computed columns ────────────────────────────────────────────────
function autoFillRows(rows) {
  return rows.map(r => {
    const u = { ...r };
    // FP GROUP from YARD LN (only if blank)
    if (!u["FP GROUP"] && u["YARD LN"]) {
      const fp = fpGroupFromYardLine(u["YARD LN"]);
      if (fp) u["FP GROUP"] = fp;
    }
    // DOWN GROUP from DN + DIST (only if blank)
    if (!u["DOWN GROUP"] && (u["DN"] || u["DIST"])) {
      const dg = buildDownGroup(u["DN"], u["DIST"]);
      if (dg) u["DOWN GROUP"] = dg;
    }
    return u;
  });
}

function parseXlsx(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        res(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      } catch (err) { rej(err); }
    };
    reader.onerror = () => rej(new Error("File could not be read"));
    reader.readAsArrayBuffer(file);
  });
}

// ── Autocomplete dropdown ─────────────────────────────────────────────────────
function SuggestionList({ suggestions, activeIdx, onSelect }) {
  if (!suggestions.length) return null;
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 2px)", left: 0, zIndex: 200,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 6, minWidth: 160, maxWidth: 280,
      boxShadow: "0 6px 20px rgba(0,0,0,.45)", overflow: "hidden",
    }}>
      {suggestions.map((s, i) => (
        <div key={s.value}
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

// ── Editable cell ─────────────────────────────────────────────────────────────
const Cell = memo(function Cell({
  id, isAnchor, isInRange, isEditing, value, editVal,
  onClick, onDoubleClick,
  onEditChange, onEditBlur, onEditKeyDown,
  suggestions, activeSuggIdx, onSuggestionSelect,
}) {
  return (
    <td id={id}
      style={{
        padding: "4px 8px", whiteSpace: "nowrap", verticalAlign: "middle",
        userSelect: "none", minWidth: 60, maxWidth: 160, position: "relative",
        background: isInRange && !isEditing ? "rgba(92,191,138,.13)" : undefined,
        outline: isAnchor ? `2px solid ${ACCENT}` : isInRange ? `1px solid rgba(92,191,138,.35)` : undefined,
        outlineOffset: -1,
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {isEditing ? (
        <>
          <input
            autoFocus value={editVal}
            onChange={onEditChange} onBlur={onEditBlur} onKeyDown={onEditKeyDown}
            style={{
              background: "#0a2a18", color: ACCENT,
              border: `1px solid ${ACCENT}`, borderRadius: 2,
              padding: "2px 4px", fontSize: 12, width: "100%",
              boxSizing: "border-box", outline: "none",
              position: "absolute", top: 2, left: 2, right: 2, bottom: 2, zIndex: 5,
            }}
          />
          <SuggestionList suggestions={suggestions || []} activeIdx={activeSuggIdx ?? -1} onSelect={onSuggestionSelect} />
        </>
      ) : (
        <span style={{ color: value ? "var(--text2)" : "var(--text3)" }}>{value || "—"}</span>
      )}
    </td>
  );
});

// ── Editable data grid ────────────────────────────────────────────────────────
function DataGrid({ rows, setRows }) {
  const [colConfig,  setColConfig] = useState(getColumnConfig);
  const [sel,        setSel]       = useState(null);
  const [selEnd,     setSelEnd]    = useState(null);
  const [editCell,   setEditCell]  = useState(null);
  const [editVal,    setEditVal]   = useState("");
  const [suggestions, setSugg]    = useState([]);
  const [suggIdx,    setSuggIdx]   = useState(-1);
  const gridRef = useRef(null);

  // Live refs
  const selRef      = useRef(sel);      selRef.current      = sel;
  const selEndRef   = useRef(selEnd);   selEndRef.current   = selEnd;
  const editRef     = useRef(editCell); editRef.current     = editCell;
  const editValRef  = useRef(editVal);  editValRef.current  = editVal;
  const rowsRef     = useRef(rows);     rowsRef.current     = rows;
  const suggRef     = useRef(suggestions); suggRef.current  = suggestions;
  const suggIdxRef  = useRef(suggIdx);  suggIdxRef.current  = suggIdx;

  const displayCols = colConfig.order.filter(c => colConfig.visible.includes(c));
  const numCols     = displayCols.length;

  // Autocomplete
  useEffect(() => {
    if (!editCell || !editVal.trim()) { setSugg([]); setSuggIdx(-1); return; }
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
    setSugg(items);
    setSuggIdx(-1);
  }, [editVal, editCell?.r, editCell?.c]);

  const startEdit = useCallback((r, c, initialChar = null) => {
    setSugg([]); setSuggIdx(-1);
    setEditCell({ r, c });
    setSel({ r, c });
    setSelEnd(null);
    setEditVal(initialChar !== null ? initialChar.toUpperCase()
      : (rowsRef.current[r]?.[displayCols[c]] ?? ""));
  }, [displayCols]);

  const commitEdit = useCallback((nextSel, overrideVal) => {
    const curEdit = editRef.current;
    const curVal  = overrideVal !== undefined ? overrideVal : editValRef.current;
    if (!curEdit) { if (nextSel) setSel(nextSel); return; }
    editRef.current = null;
    const col  = displayCols[curEdit.c];
    const next = rowsRef.current.map((row, i) => {
      if (i !== curEdit.r) return row;
      const upd = { ...row, [col]: curVal };
      // Auto-derive FP GROUP when YARD LN is edited
      if (col === "YARD LN") {
        const fp = fpGroupFromYardLine(curVal);
        if (fp) upd["FP GROUP"] = fp;
      }
      // Auto-derive DOWN GROUP when DN or DIST is edited
      if ((col === "DN" || col === "DIST") && !upd["DOWN GROUP"]) {
        const dg = buildDownGroup(upd["DN"], upd["DIST"]);
        if (dg) upd["DOWN GROUP"] = dg;
      }
      return upd;
    });
    setRows(next);
    setEditCell(null);
    setSugg([]); setSuggIdx(-1);
    if (nextSel) setSel(nextSel);
  }, [displayCols, setRows]);

  const cancelEdit = useCallback(() => {
    setEditCell(null); setSugg([]); setSuggIdx(-1);
  }, []);

  const handleSuggSelect = useCallback((value) => {
    editValRef.current = value;
    setEditVal(value);
    setSugg([]); setSuggIdx(-1);
    setTimeout(() => commitEdit(null), 0);
  }, [commitEdit]);

  const handleEditKeyDown = useCallback((e, ri, ci) => {
    const suggs = suggRef.current;
    const sIdx  = suggIdxRef.current;
    const hasSug = suggs.length > 0;

    if (hasSug && e.key === "ArrowDown") { e.preventDefault(); setSuggIdx(i => Math.min(i + 1, suggs.length - 1)); return; }
    if (hasSug && e.key === "ArrowUp")   { e.preventDefault(); setSuggIdx(i => Math.max(i - 1, -1)); return; }

    function pickedVal() { return sIdx >= 0 ? suggs[sIdx].value : null; }

    if (e.key === "Escape") {
      e.preventDefault();
      if (hasSug) { setSugg([]); setSuggIdx(-1); } else cancelEdit();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const val = pickedVal(); if (val) editValRef.current = val;
      setSugg([]); setSuggIdx(-1);
      commitEdit(null, val ?? undefined);
      setTimeout(() => startEdit(Math.min(ri + 1, rowsRef.current.length - 1), ci), 0);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const val = pickedVal(); if (val) editValRef.current = val;
      setSugg([]); setSuggIdx(-1);
      const nc = e.shiftKey ? Math.max(ci - 1, 0) : Math.min(ci + 1, numCols - 1);
      commitEdit(null, val ?? undefined);
      setTimeout(() => startEdit(ri, nc), 0);
      return;
    }
    if (e.key === "ArrowRight") { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(ri, Math.min(ci+1, numCols-1)), 0); return; }
    if (e.key === "ArrowLeft")  { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(ri, Math.max(ci-1, 0)), 0); return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(Math.min(ri+1, rowsRef.current.length-1), ci), 0); return; }
    if (e.key === "ArrowUp")    { e.preventDefault(); commitEdit(null); setTimeout(() => startEdit(Math.max(ri-1, 0), ci), 0); return; }
  }, [cancelEdit, commitEdit, numCols, startEdit]);

  function handleGridKey(e) {
    const curSel    = selRef.current;
    const curEdit   = editRef.current;
    const curSelEnd = selEndRef.current;
    const curRows   = rowsRef.current;
    if (!curSel) return;
    const { r, c } = curSel;
    if (curEdit) { if (e.key === "Escape") { e.preventDefault(); cancelEdit(); } return; }

    if (e.shiftKey && ["ArrowRight","ArrowLeft","ArrowDown","ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const base = curSelEnd ?? curSel;
      let { r: er, c: ec } = base;
      if (e.key === "ArrowRight") ec = Math.min(ec+1, numCols-1);
      if (e.key === "ArrowLeft")  ec = Math.max(ec-1, 0);
      if (e.key === "ArrowDown")  er = Math.min(er+1, curRows.length-1);
      if (e.key === "ArrowUp")    er = Math.max(er-1, 0);
      setSelEnd({ r: er, c: ec }); return;
    }

    if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) { e.preventDefault(); setSelEnd(null); setSel({ r, c: Math.min(c+1, numCols-1) }); }
    else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) { e.preventDefault(); setSelEnd(null); setSel({ r, c: Math.max(c-1, 0) }); }
    else if (e.key === "ArrowDown")  { e.preventDefault(); setSelEnd(null); setSel({ r: Math.min(r+1, curRows.length-1), c }); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); setSelEnd(null); setSel({ r: Math.max(r-1, 0), c }); }
    else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); setSelEnd(null); startEdit(r, c); }
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const r1 = curSelEnd ? Math.min(r, curSelEnd.r) : r, r2 = curSelEnd ? Math.max(r, curSelEnd.r) : r;
      const c1 = curSelEnd ? Math.min(c, curSelEnd.c) : c, c2 = curSelEnd ? Math.max(c, curSelEnd.c) : c;
      setRows(curRows.map((row, ri) => {
        if (ri < r1 || ri > r2) return row;
        const upd = { ...row };
        for (let ci = c1; ci <= c2; ci++) upd[displayCols[ci]] = "";
        return upd;
      }));
    }
    else if (e.key === "Escape") { if (curSelEnd) setSelEnd(null); else setSel(null); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setSelEnd(null); startEdit(r, c, e.key); }
  }

  useEffect(() => {
    if (!sel) return;
    document.getElementById(`ug-cell-${sel.r}-${sel.c}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  useEffect(() => {
    if (sel && !editCell) gridRef.current?.focus();
  }, [sel?.r, sel?.c, editCell]);

  if (!rows.length) return (
    <div style={{ color: "var(--text3)", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
      Upload a Play Data file to see it here.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Column toggle bar */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap", padding: "6px 0 10px",
        borderBottom: "1px solid var(--border)", marginBottom: 8,
      }}>
        {ALL_COLUMNS.map(col => {
          const on = colConfig.visible.includes(col);
          return (
            <button key={col} onClick={() => {
              const vis = on ? colConfig.visible.filter(c => c !== col) : [...colConfig.visible, col];
              const cfg = { ...colConfig, visible: vis };
              setColConfig(cfg); saveColumnConfig(cfg);
            }} style={{
              background: on ? "rgba(92,191,138,.12)" : "var(--surface2)",
              color:      on ? ACCENT : "var(--text3)",
              border:     on ? "1px solid rgba(92,191,138,.3)" : "1px solid var(--border)",
              borderRadius: 4, padding: "2px 8px", fontSize: 10,
              fontWeight: on ? 700 : 400, cursor: "pointer",
            }}>{col}</button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, outline: "none" }}
        ref={gridRef} tabIndex={0} onKeyDown={handleGridKey}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
          <thead>
            <tr style={{ background: "var(--surface2)", position: "sticky", top: 0, zIndex: 10 }}>
              <th style={{ ...thStyle, width: 36 }}>#</th>
              {displayCols.map(col => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const r1 = Math.min(sel?.r ?? ri, selEnd?.r ?? sel?.r ?? ri);
              const r2 = Math.max(sel?.r ?? ri, selEnd?.r ?? sel?.r ?? ri);
              const c1 = Math.min(sel?.c ?? 0,  selEnd?.c ?? sel?.c ?? 0);
              const c2 = Math.max(sel?.c ?? 0,  selEnd?.c ?? sel?.c ?? 0);
              return (
                <tr key={ri} style={{
                  background: ri % 2 === 0 ? "var(--bg)" : "var(--surface)",
                  borderBottom: "1px solid var(--border)",
                }}>
                  <td style={{ ...tdStyle, color: "var(--text3)", textAlign: "center", width: 36 }}>{ri+1}</td>
                  {displayCols.map((col, ci) => {
                    const inRange = sel != null && ri >= r1 && ri <= r2 && ci >= c1 && ci <= c2;
                    const isAnch  = ri === sel?.r && ci === sel?.c;
                    const isEdit  = editCell?.r === ri && editCell?.c === ci;
                    return (
                      <Cell
                        key={col}
                        id={`ug-cell-${ri}-${ci}`}
                        isAnchor={isAnch} isInRange={inRange} isEditing={isEdit}
                        value={row[col]} editVal={isEdit ? editVal : ""}
                        onClick={e => {
                          gridRef.current?.focus();
                          if (e.shiftKey && sel) { commitEdit(null); setSelEnd({ r: ri, c: ci }); }
                          else { setSelEnd(null); startEdit(ri, ci); }
                        }}
                        onDoubleClick={() => startEdit(ri, ci)}
                        onEditChange={e => setEditVal(e.target.value.toUpperCase())}
                        onEditBlur={() => setTimeout(() => { if (editRef.current) commitEdit(null); }, 80)}
                        onEditKeyDown={e => handleEditKeyDown(e, ri, ci)}
                        suggestions={isEdit ? suggestions : []}
                        activeSuggIdx={isEdit ? suggIdx : -1}
                        onSuggestionSelect={handleSuggSelect}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Upload card ───────────────────────────────────────────────────────────────
function UploadCard({ label, description, accept, status, loading, onUpload, multiple = false }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>{description}</div>
        {status && (
          <div style={{ fontSize: 12, marginTop: 6,
            color: status.startsWith("✅") ? ACCENT : status.startsWith("❌") ? "#e57373" : "var(--text3)" }}>
            {status}
          </div>
        )}
      </div>
      <label style={{
        background: loading ? "var(--surface2)" : GREEN, color: loading ? "var(--text3)" : "#fff",
        border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13,
        fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
      }}>
        {loading ? "Uploading…" : "Upload"}
        <input type="file" accept={accept} multiple={multiple} style={{ display: "none" }}
          disabled={loading}
          onChange={e => { if (e.target.files?.length) onUpload(e.target.files); e.target.value = ""; }} />
      </label>
    </div>
  );
}

// ── Formation images section ──────────────────────────────────────────────────
function FormationImagesSection({ teamId }) {
  const [images,  setImages]  = useState({});
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState("");
  const [loaded,  setLoaded]  = useState(false);

  async function loadImages() {
    if (!teamId) return;
    const imgs = await apiGetImages(teamId).catch(() => ({}));
    setImages(imgs); setLoaded(true);
  }

  async function handleUpload(files) {
    if (!teamId) return;
    setLoading(true); setStatus("");
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        await apiUploadImage(teamId, file); count++;
      }
      setStatus(`✅ ${count} image(s) uploaded`);
      setImages(await apiGetImages(teamId)); setLoaded(true);
    } catch (e) { setStatus(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }

  async function handleDelete(normName) {
    if (!teamId) return;
    await apiDeleteImage(teamId, normName).catch(() => {});
    setImages(prev => { const n = { ...prev }; delete n[normName]; return n; });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>Formation Images</div>
          <div style={{ color: "var(--text3)", fontSize: 12, marginTop: 2 }}>
            PNG/JPG — filename = formation name (e.g. "Trips_Right.jpg"). Team-wide, not game-specific.
          </div>
          {status && (
            <div style={{ fontSize: 12, marginTop: 6, color: status.startsWith("✅") ? ACCENT : "#e57373" }}>
              {status}
            </div>
          )}
        </div>
        <label style={{
          background: loading ? "var(--surface2)" : GREEN, color: loading ? "var(--text3)" : "#fff",
          border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13,
          fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "Uploading…" : "Upload Images"}
          <input type="file" accept="image/*" multiple style={{ display: "none" }}
            disabled={loading || !teamId}
            onChange={e => e.target.files?.length && handleUpload(e.target.files)} />
        </label>
        {!loaded && teamId && (
          <button onClick={loadImages} style={{
            background: "var(--surface2)", color: "var(--text3)", border: "1px solid var(--border)",
            borderRadius: 7, padding: "8px 14px", fontSize: 12, cursor: "pointer",
          }}>Show existing</button>
        )}
      </div>
      {loaded && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {Object.entries(images).length === 0
            ? <span style={{ color: "var(--text3)", fontSize: 12 }}>No images uploaded yet.</span>
            : Object.entries(images).map(([normName, url]) => (
              <div key={normName} style={{
                position: "relative", background: "var(--surface2)",
                borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)",
              }}>
                <img src={url} alt={normName} style={{ width: 120, height: 52, objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  background: "rgba(0,0,0,.65)", padding: "2px 4px",
                  fontSize: 9, color: "#ccc", textOverflow: "ellipsis",
                  overflow: "hidden", whiteSpace: "nowrap",
                }}>{normName}</div>
                <button onClick={() => handleDelete(normName)} style={{
                  position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.5)",
                  border: "none", borderRadius: 3, color: "#fff", fontSize: 10,
                  cursor: "pointer", padding: "1px 4px", lineHeight: 1.4,
                }}>✕</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── Main Upload page ──────────────────────────────────────────────────────────
export default function Upload() {
  const { selectedGame, selectedSeason, refreshGames, playRows, mode } = useApp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("uploads"); // "uploads" | "grid"
  const [status,    setStatus]    = useState({});
  const [loading,   setLoading]   = useState({});

  // Grid state — holds the currently loaded play data (parsed + auto-filled)
  const [gridRows,     setGridRows]     = useState([]);
  const [gridDirty,    setGridDirty]    = useState(false);
  const [gridSaving,   setGridSaving]   = useState(false);
  const [gridSaveMsg,  setGridSaveMsg]  = useState("");
  const [autoFillInfo, setAutoFillInfo] = useState(null); // {filled, total}

  const teamId = selectedSeason?.team_id;

  // When game changes, reload play data into grid via API
  useEffect(() => {
    if (!selectedGame) { setGridRows([]); setGridDirty(false); setAutoFillInfo(null); return; }
    setGridDirty(false);
    setGridSaveMsg("");
    apiGetPlays(selectedGame.id)
      .then(raw => {
        if (raw && raw.length) {
          const filled = autoFillRows(raw);
          const changedCount = filled.filter((r, i) => r["FP GROUP"] !== raw[i]["FP GROUP"]).length;
          setGridRows(filled);
          if (changedCount > 0) setAutoFillInfo({ filled: changedCount, total: raw.length });
          else setAutoFillInfo(null);
        } else {
          setGridRows([]);
          setAutoFillInfo(null);
        }
      })
      .catch(() => { setGridRows([]); setAutoFillInfo(null); });
  }, [selectedGame?.id]);

  // Track grid edits
  function handleGridChange(newRows) {
    setGridRows(newRows);
    setGridDirty(true);
    setGridSaveMsg("");
  }

  async function handleSaveGrid() {
    if (!selectedGame) return;
    setGridSaving(true); setGridSaveMsg("");
    try {
      await apiSavePlays(selectedGame.id, gridRows);
      refreshGames(selectedSeason?.id);
      setGridDirty(false);
      setGridSaveMsg("✅ Saved");
    } catch (e) {
      setGridSaveMsg(`❌ ${e.message}`);
    } finally {
      setGridSaving(false);
    }
  }

  async function handleUploadPlays(files) {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, playdata: true }));
    setStatus(s => ({ ...s, playdata: "" }));
    try {
      const raw    = await parsePlaylistData(files[0]);
      const filled = autoFillRows(raw);
      const changedCount = filled.filter((r, i) => r["FP GROUP"] !== raw[i]["FP GROUP"]).length;

      await apiSavePlays(selectedGame.id, filled);
      refreshGames(selectedSeason?.id);

      setGridRows(filled);
      setGridDirty(false);
      setAutoFillInfo({ filled: changedCount, total: filled.length });
      setStatus(s => ({
        ...s,
        playdata: `✅ ${filled.length} rows imported${changedCount > 0 ? ` · FP GROUP auto-filled for ${changedCount} rows` : ""}`,
      }));
      // Switch to grid tab after upload
      setActiveTab("grid");
    } catch (ex) {
      setStatus(s => ({ ...s, playdata: `❌ ${ex.message}` }));
    } finally {
      setLoading(l => ({ ...l, playdata: false }));
    }
  }

  async function handleUploadRoster(files) {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, roster: true }));
    setStatus(s => ({ ...s, roster: "" }));
    try {
      const rows = await parseXlsx(files[0]);

      // ── Parse rows immediately into depth chart ───────────────────────────
      const POSITIONS = ["QB","RB","FB","TE","SB","WR_L","WR_R","LT","LG","C","RG","RT"];
      const depth = Object.fromEntries(POSITIONS.map(k => [k, []]));

      const slotMap = {
        QB:"QB", RB:"RB", FB:"FB", TE:"TE", SB:"SB",
        WR:"WR", WRL:"WR_L", LWR:"WR_L",
        WRR:"WR_R", RWR:"WR_R",
        LT:"LT", LG:"LG", C:"C", RG:"RG", RT:"RT",
        OL:"OL",
      };
      const olOrder = ["LT","LG","C","RG","RT"];
      let olIdx = 0, wrIdx = 0;

      function col(p, ...names) {
        const keys = Object.keys(p);
        for (const n of names) {
          const found = keys.find(k => k.toLowerCase() === n.toLowerCase());
          if (found !== undefined && p[found] !== "" && p[found] != null)
            return String(p[found]).trim();
        }
        return "";
      }

      let imported = 0;
      rows.forEach((p, i) => {
        if (!p || typeof p !== "object") return;
        const pos  = col(p, "position", "pos").toUpperCase();
        if (!pos) return;
        let slot = slotMap[pos];
        if (!slot) return;
        if (slot === "WR")  slot = wrIdx++ % 2 === 0 ? "WR_L" : "WR_R";
        if (slot === "OL")  slot = olOrder[olIdx++ % olOrder.length];
        depth[slot].push({
          number:      col(p, "#", "number", "nr", "no", "jersey"),
          firstname:   col(p, "first", "firstname", "vorname", "first name"),
          lastname:    col(p, "last", "lastname", "nachname", "last name", "name"),
          nationality: col(p, "nat", "nationality", "nationalität", "nation"),
          position:    pos,
          dcPos:       i + 1,
          markColor:   null,
        });
        imported++;
      });
      // ─────────────────────────────────────────────────────────────────────

      await apiSaveRoster(selectedGame.id, { depth, importData: rows });
      setStatus(s => ({ ...s, roster: `✅ ${imported} Spieler importiert` }));
    } catch (ex) {
      setStatus(s => ({ ...s, roster: `❌ ${ex.message || "Upload failed"}` }));
    } finally {
      setLoading(l => ({ ...l, roster: false }));
    }
  }

  async function handleClearRoster() {
    if (!selectedGame) return;
    setLoading(l => ({ ...l, rosterClear: true }));
    setStatus(s => ({ ...s, roster: "" }));
    try {
      let current = {};
      try { const res = await apiGetRoster(selectedGame.id); if (res && typeof res === "object") current = res; } catch {}
      await apiSaveRoster(selectedGame.id, { ...current, importData: null });
      setStatus(s => ({ ...s, roster: "✅ Roster data cleared" }));
    } catch (ex) {
      setStatus(s => ({ ...s, roster: `❌ ${ex.message || "Clear failed"}` }));
    } finally {
      setLoading(l => ({ ...l, rosterClear: false }));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxHeight: "100vh" }}>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)", padding: "0 24px", flexShrink: 0,
      }}>
        {[
          { id: "uploads", label: "📁 Uploads" },
          { id: "grid",    label: `📋 Play Data${gridRows.length ? ` (${gridRows.length})` : ""}` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : "2px solid transparent",
              color: activeTab === tab.id ? ACCENT : "var(--text3)",
              padding: "14px 18px", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: "pointer", transition: "color .12s",
            }}>
            {tab.label}
          </button>
        ))}

        {/* Save button in tab bar (only on grid tab) */}
        {activeTab === "grid" && gridRows.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {gridSaveMsg && (
              <span style={{
                fontSize: 12,
                color: gridSaveMsg.startsWith("✅") ? ACCENT : "#e57373",
              }}>{gridSaveMsg}</span>
            )}
            {autoFillInfo && autoFillInfo.filled > 0 && (
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                FP GROUP auto-filled: <strong style={{ color: ACCENT }}>{autoFillInfo.filled}</strong> rows
              </span>
            )}
            <button
              disabled={!gridDirty || gridSaving || !selectedGame}
              onClick={handleSaveGrid}
              style={{
                background: gridDirty && selectedGame ? GREEN : "var(--surface2)",
                color:      gridDirty && selectedGame ? "#fff"  : "var(--text3)",
                border: "none", borderRadius: 7, padding: "7px 18px",
                fontSize: 12, fontWeight: 700, cursor: gridDirty && selectedGame ? "pointer" : "not-allowed",
              }}>
              {gridSaving ? "Saving…" : "💾 Save to Game"}
            </button>
          </div>
        )}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>

        {/* Uploads tab */}
        {activeTab === "uploads" && (
          <div style={{ padding: "24px 28px", maxWidth: 800 }}>
            <h2 style={{ color: "var(--text)", margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
              Upload
            </h2>
            <p style={{ color: "var(--text3)", fontSize: 12, margin: "0 0 8px" }}>
              Manage all data uploads.
              FP GROUP and DOWN GROUP are automatically computed from YARD LN / DN / DIST on import.
            </p>

            {/* Game Data */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ color: "var(--text2)", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>
                Game Data
                {selectedGame
                  ? <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>
                      W{selectedGame.week} — {selectedGame.opponent}
                    </span>
                  : <span style={{ color: "#e57373", fontWeight: 400, marginLeft: 8 }}>
                      — select a game in the sidebar
                    </span>
                }
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <UploadCard
                  label="Play Data"
                  description="PlaylistData .xlsx — FP GROUP and DOWN GROUP auto-filled from YARD LN / DN / DIST"
                  accept=".xlsx"
                  status={status.playdata}
                  loading={loading.playdata}
                  onUpload={handleUploadPlays}
                />
                <UploadCard
                  label="Roster"
                  description="Roster file (CSV or .xlsx) — player information"
                  accept=".xlsx,.csv"
                  status={status.roster}
                  loading={loading.roster}
                  onUpload={handleUploadRoster}
                />
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "12px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ color: "var(--text3)", fontSize: 12 }}>
                    Clear the uploaded roster data for this game (keeps depth chart).
                  </div>
                  <button
                    disabled={!selectedGame || loading.rosterClear}
                    onClick={handleClearRoster}
                    style={{
                      background: !selectedGame || loading.rosterClear ? "var(--surface2)" : "#5a1a1a",
                      color: !selectedGame || loading.rosterClear ? "var(--text3)" : "#ffaaaa",
                      border: "1px solid var(--border)", borderRadius: 7,
                      padding: "8px 18px", fontSize: 13, fontWeight: 600,
                      cursor: !selectedGame || loading.rosterClear ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}>
                    {loading.rosterClear ? "Clearing…" : "Clear Roster Data"}
                  </button>
                </div>
              </div>
            </div>

            {/* Formation Images */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "16px 20px",
            }}>
              <div style={{ color: "var(--text2)", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: .8, marginBottom: 14 }}>
                Formation Images
                {teamId
                  ? <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: 8 }}>{selectedSeason?.name}</span>
                  : <span style={{ color: "#e57373", fontWeight: 400, marginLeft: 8 }}>— select a season</span>
                }
              </div>
              {teamId
                ? <FormationImagesSection teamId={teamId} />
                : <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>
                    Select a season from the sidebar to manage formation images.
                  </p>
              }
            </div>
          </div>
        )}

        {/* Grid tab */}
        {activeTab === "grid" && (
          <div style={{
            display: "flex", flexDirection: "column",
            height: "100%", padding: "12px 16px", boxSizing: "border-box",
          }}>
            {!selectedGame ? (
              <div style={{ color: "var(--text3)", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
                Select a game from the sidebar first.
              </div>
            ) : (
              <DataGrid rows={gridRows} setRows={handleGridChange} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Style constants ───────────────────────────────────────────────────────────
const thStyle = {
  padding: "5px 8px", textAlign: "left", fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: .5, color: "var(--text3)",
  borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)",
  whiteSpace: "nowrap",
};
const tdStyle = { padding: "4px 8px" };
