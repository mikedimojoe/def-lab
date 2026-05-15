/**
 * Drawings.jsx — Apple-style play drawing tool
 * Draw mode + separate Viewer mode (also reachable via Sidebar)
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { useTheme } from "../contexts/ThemeContext";
import { apiGetDrawings, apiSaveDrawing, apiDeleteDrawing, apiPatchLiveRow, apiGetDrawingState, apiPutDrawingState, apiGetUserSettings, apiSaveUserSettings } from "../lib/api";
import { buildDownGroup } from "../lib/dataEngine";

// ── Canvas constants ──────────────────────────────────────────────────────────
const VW = 520, VH = 390;
// Each "yard" unit in canvas coords (5 yards = 1 hash-line interval)
const YARD   = 14;            // px per yard
const LOS_Y  = 210;           // line of scrimmage y

// OL geometry — base values, scaled by olScale setting
const OL_BASE_R  = 7;
const OL_BASE_X  = [185, 213, 241, 269, 297]; // LT LG C RG RT (spacing=28)
const OL_BASE_QB = LOS_Y + 24;

// ── Tool defs ─────────────────────────────────────────────────────────────────
const TOOLS = [
  { id: "pen",       label: "Stift",   Icon: PenIcon       },
  { id: "marker",    label: "Marker",  Icon: MarkerIcon     },
  { id: "eraser-el", label: "Objekt",  Icon: EraserElIcon   },
  { id: "eraser-px", label: "Radierer",Icon: EraserPxIcon   },
];
const ERASER_R = 18;
function isEraser(tool) { return tool === "eraser-el" || tool === "eraser-px"; }

// ── Colors ────────────────────────────────────────────────────────────────────
const PALETTE = [
  "#E8283A","#FF6B35","#F59E0B","#22C55E",
  "#3B82F6","#8B5CF6","#EC4899","#06B6D4",
  "#000000","#374151","#6B7280","#D1D5DB",
  "#92400E","#166534","#1E3A8A","#7E22CE",
];

// Drive auto-color palette — yellow (#F59E0B) + light grey (#D1D5DB) + mid grey (#6B7280) removed
// Index 0 = drive 1 (red default), cycles through per drive number
const DRIVE_PALETTE = [
  "#E8283A", // D1 – red
  "#3B82F6", // D2 – blue
  "#22C55E", // D3 – green
  "#FF6B35", // D4 – orange
  "#8B5CF6", // D5 – purple
  "#06B6D4", // D6 – cyan
  "#EC4899", // D7 – pink
  "#92400E", // D8 – brown
  "#1E3A8A", // D9 – navy
  "#166534", // D10 – dark green
  "#7E22CE", // D11 – dark purple
  "#000000", // D12 – black
  "#374151", // D13 – dark grey
];

// ── Width defs ────────────────────────────────────────────────────────────────
const WIDTHS = [
  { id: "xs", bw: 2.0, lh: 2  },
  { id: "sm", bw: 4.5, lh: 4  },
  { id: "md", bw: 8.5, lh: 7  },
  { id: "lg", bw: 14,  lh: 12 },
];

// ── Play type colors (match app CSS vars via inline fallbacks) ────────────────
const PT_COLOR = {
  run:  "var(--run-color)",
  pass: "var(--pass-color)",
  rpo:  "var(--rpo-color)",
  pap:  "#f59e0b",
};
function ptColor(s) { return PT_COLOR[String(s ?? "").toLowerCase()] ?? "#6B7280"; }

// ═══════════════════════════════════════════════════════
// MATH / DRAWING
// ═══════════════════════════════════════════════════════
function buildInkPath(pts, bw) {
  if (!pts || pts.length < 2) return "";
  const n = pts.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const t  = i / Math.max(1, n - 1);
    const tp = Math.pow(Math.sin(t * Math.PI), 0.28);
    const pr = Math.max(0.12, pts[i].p ?? 0.5);
    const hw = Math.max(0.4, (bw * pr * tp) / 2);
    const a  = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) { L.push(pts[i]); R.push(pts[i]); continue; }
    const nx = -dy / len * hw, ny = dx / len * hw;
    L.push({ x: pts[i].x + nx, y: pts[i].y + ny });
    R.push({ x: pts[i].x - nx, y: pts[i].y - ny });
  }
  const all = [...L, ...R.reverse()];
  return "M" + all.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join("L") + "Z";
}

function buildSmoothPath(pts) {
  if (!pts || pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i].x + pts[i+1].x)/2).toFixed(2);
    const my = ((pts[i].y + pts[i+1].y)/2).toFixed(2);
    d += ` Q${pts[i].x.toFixed(2)},${pts[i].y.toFixed(2)},${mx},${my}`;
  }
  return d + ` L${pts[pts.length-1].x.toFixed(2)},${pts[pts.length-1].y.toFixed(2)}`;
}

function hitTest(stroke, ex, ey, r) {
  for (const p of stroke.points) { if (Math.hypot(p.x - ex, p.y - ey) < r) return true; }
  return false;
}

// Pixel eraser — splits strokes at erased points, returns new stroke list
function erasePoints(strokes, ex, ey, r) {
  const result = [];
  let changed = false;
  for (const stroke of strokes) {
    let seg = [];
    for (const pt of stroke.points) {
      if (Math.hypot(pt.x - ex, pt.y - ey) < r) {
        changed = true;
        if (seg.length >= 2) result.push({ ...stroke, points: seg, pathD: buildSmoothPath(seg) });
        seg = [];
      } else {
        seg.push(pt);
      }
    }
    if (seg.length === stroke.points.length) result.push(stroke); // nothing erased
    else if (seg.length >= 2) result.push({ ...stroke, points: seg, pathD: buildSmoothPath(seg) });
  }
  return changed ? result : null; // null = no change
}

function getField(row, ...keys) {
  for (const k of keys) {
    const v = String(row?.[k] ?? "").trim();
    if (v && v !== "0") return v;
  }
  return null;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── OL scale setting (localStorage) ──────────────────────────────────────────
function getOLScale() { return parseFloat(localStorage.getItem("olScale") ?? "1.0"); }
function setOLScale(v) { localStorage.setItem("olScale", String(v)); }

// ═══════════════════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════════════════
function PenIcon({ active }) {
  const c = active ? "#007AFF" : "#555";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
      stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function MarkerIcon({ active }) {
  const c = active ? "#007AFF" : "#555";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="10" width="18" height="6" rx="3" stroke={c} strokeWidth="2"/>
    <path d="M19 13h2M5 13H3" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}
// Stroke (object) eraser — removes whole strokes
function EraserElIcon({ active }) {
  const c = active ? "#007AFF" : "#555";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M20 20H7L3 16l9-9 8 8-3 3" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 17L17 6" stroke={c} strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}
// Pixel eraser — removes points within radius
function EraserPxIcon({ active }) {
  const c = active ? "#007AFF" : "#555";
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="2" strokeDasharray="3 2"/>
    <path d="M9 9l6 6M15 9l-6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>;
}

// ═══════════════════════════════════════════════════════
// FIELD + OL TEMPLATE
// ═══════════════════════════════════════════════════════
function FieldBG() {
  const { theme } = useTheme();
  const lineColor = theme === "dark" ? "#2a2a2a" : "#F0F0F0";
  const lines = [];
  for (let y = -10; y <= 10; y++) {
    const cy = LOS_Y - y * YARD * 5;
    if (cy < 0 || cy > VH) continue;
    lines.push(<line key={y} x1={0} x2={VW} y1={cy} y2={cy}
      stroke={lineColor} strokeWidth={y === 0 ? 0 : 1}/>);
  }
  return <g style={{ pointerEvents: "none" }}>{lines}</g>;
}

function OLTemplate({ scale = 1 }) {
  const { theme } = useTheme();
  const fill   = theme === "dark" ? "#1e1e1e" : "white";
  const stroke = theme === "dark" ? "#aaaaaa" : "#333";
  const r   = OL_BASE_R * scale;
  const xs  = OL_XS(scale);
  return (
    <g style={{ pointerEvents: "none" }}>
      {xs.map((x, i) =>
        i === 2
          ? <rect key={i} x={x - r} y={LOS_Y - r} width={r*2} height={r*2} rx={2}
              fill={fill} stroke={stroke} strokeWidth={2}/>
          : <circle key={i} cx={x} cy={LOS_Y} r={r}
              fill={fill} stroke={stroke} strokeWidth={2}/>
      )}
    </g>
  );
}

function OL_XS(scale) {
  const spacing = 28 * scale;
  const cX = VW / 2;
  return [-2, -1, 0, 1, 2].map(i => cX + i * spacing);
}

// ═══════════════════════════════════════════════════════
// STROKE ELEMENT
// ═══════════════════════════════════════════════════════
function StrokeEl({ stroke }) {
  if (!stroke.pathD) return null;
  const opacity = stroke.tool === "marker" ? 0.55 : 1;
  return <path d={stroke.pathD} fill="none" stroke={stroke.color}
    strokeWidth={stroke.bw} strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>;
}

// ═══════════════════════════════════════════════════════
// COLOR PICKER
// ═══════════════════════════════════════════════════════
function ColorPickerPopover({ color, onChange, onClose }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const popBg = dark ? "rgba(28,28,28,0.97)" : "rgba(250,250,250,0.98)";
  const popBorder = dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.9)";
  return <>
    <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose}/>
    <div style={{
      position: "absolute", bottom: "calc(100% + 14px)", left: "50%",
      transform: "translateX(-50%)",
      background: popBg, backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: 20, padding: 16,
      boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
      border: popBorder, zIndex: 200, width: 204,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 12 }}>
        {PALETTE.map(c => (
          <button key={c} onClick={() => { onChange(c); onClose(); }} style={{
            width: 38, height: 38, borderRadius: "50%", background: c,
            border: color === c ? `3px solid ${dark ? "#fff" : "#222"}` : `2px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"}`,
            cursor: "pointer", boxSizing: "border-box",
          }}/>
        ))}
      </div>
      <input type="color" value={color} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", height: 34, borderRadius: 10, border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, cursor: "pointer", padding: 2 }}/>
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════
// WIDTH PICKER
// ═══════════════════════════════════════════════════════
function WidthPickerPopover({ widthId, onChange, color, onClose }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const popBg = dark ? "rgba(28,28,28,0.97)" : "rgba(250,250,250,0.98)";
  const popBorder = dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.9)";
  return <>
    <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose}/>
    <div style={{
      position: "absolute", bottom: "calc(100% + 14px)", left: "50%",
      transform: "translateX(-50%)",
      background: popBg, backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: 16, padding: "10px 14px",
      boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
      border: popBorder, zIndex: 200, minWidth: 100,
    }}>
      {WIDTHS.map(w => (
        <button key={w.id} onClick={() => { onChange(w.id); onClose(); }} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: "100%", height: 38, marginBottom: 4, borderRadius: 10,
          background: widthId === w.id ? "rgba(92,191,138,0.15)" : "transparent",
          border: widthId === w.id ? "1.5px solid var(--accent)" : "1.5px solid transparent",
          cursor: "pointer",
        }}>
          <div style={{ width: 64, height: w.lh, borderRadius: 99,
            background: widthId === w.id ? "var(--accent)" : color, opacity: widthId === w.id ? 1 : 0.7 }}/>
        </button>
      ))}
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════
// OL SETTINGS POPOVER
// ═══════════════════════════════════════════════════════
function OLSettingsPopover({ olScale, onChangeScale, autoDriveColor, onToggleAutoDriveColor, onClose }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const popBg = dark ? "rgba(28,28,28,0.97)" : "rgba(250,250,250,0.98)";
  const popBorder = dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.9)";
  return <>
    <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose}/>
    <div style={{
      position: "absolute", bottom: "calc(100% + 14px)", right: 0,
      background: popBg, backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderRadius: 16, padding: "14px 16px",
      boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
      border: popBorder,
      zIndex: 200, width: 220,
    }}>
      {/* OL size */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", marginBottom: 10, letterSpacing: .4 }}>
        OL SIZE
      </div>
      <input type="range" min="0.4" max="1.6" step="0.05" value={olScale}
        onChange={e => onChangeScale(parseFloat(e.target.value))}
        style={{ width: "100%" }}/>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
        <span>Small</span>
        <span style={{ fontWeight: 700, color: "var(--text)" }}>{Math.round(olScale * 100)}%</span>
        <span>Large</span>
      </div>
      <button onClick={() => onChangeScale(1.0)} style={{
        marginTop: 10, width: "100%", padding: "6px 0", borderRadius: 8,
        border: "1px solid var(--border)", background: "transparent",
        fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--text2)",
      }}>Reset to Default</button>

      {/* Divider */}
      <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", margin: "14px 0" }}/>

      {/* Drive color toggle */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
        onClick={onToggleAutoDriveColor}>
        {/* Toggle switch */}
        <div style={{
          width: 36, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
          background: autoDriveColor ? "#22C55E" : (dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)"),
          position: "relative", transition: "background .18s",
        }}>
          <div style={{
            position: "absolute", top: 3, left: autoDriveColor ? 19 : 3,
            width: 14, height: 14, borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
            transition: "left .18s",
          }}/>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
            Farbe nach Drive
          </div>
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 3, lineHeight: 1.4 }}>
            Stiftfarbe wechselt automatisch pro Drive
          </div>
          {/* Color preview dots */}
          <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
            {DRIVE_PALETTE.slice(0, 8).map((c, i) => (
              <div key={c} style={{
                width: 12, height: 12, borderRadius: "50%", background: c,
                opacity: autoDriveColor ? 1 : 0.35,
                outline: i === 0 ? "1.5px solid rgba(255,255,255,0.5)" : "none",
                outlineOffset: 1,
              }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════
// FLOATING TOOLBAR
// ═══════════════════════════════════════════════════════
function FloatingToolbar({ tool, setTool, color, setColor, widthId, setWidthId,
  canUndo, canRedo, onUndo, onRedo, olScale, onChangeScale,
  autoDriveColor, onToggleAutoDriveColor }) {

  const { theme } = useTheme();
  const dark = theme === "dark";
  const [colorOpen, setColorOpen] = useState(false);
  const [widthOpen, setWidthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const closeAll = () => { setColorOpen(false); setWidthOpen(false); setSettingsOpen(false); };
  const bwLh = WIDTHS.find(w => w.id === widthId)?.lh ?? 4;

  const tbBg     = dark ? "rgba(22,22,22,0.94)" : "rgba(255,255,255,0.88)";
  const tbBorder = dark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.95)";
  const tbShadow = dark ? "0 8px 40px rgba(0,0,0,0.55)" : "0 8px 40px rgba(0,0,0,0.18)";

  return (
    <div style={{
      position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 2,
      background: tbBg,
      backdropFilter: "blur(30px) saturate(180%)",
      WebkitBackdropFilter: "blur(30px) saturate(180%)",
      border: tbBorder, borderRadius: 22, padding: "7px 10px",
      boxShadow: tbShadow,
      zIndex: 100, fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
    }}>
      {/* Tool buttons */}
      {TOOLS.map(({ id, label, Icon }) => {
        const active = tool === id;
        return (
          <button key={id} onClick={() => setTool(id)} style={{
            width: 50, height: 46, borderRadius: 14, border: "none",
            background: active ? "rgba(92,191,138,0.15)" : "transparent",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
          }}>
            <Icon active={active}/>
            <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500,
              color: active ? "var(--accent)" : "var(--text3)", letterSpacing: 0.2 }}>{label}</span>
          </button>
        );
      })}

      <Sep dark={dark}/>

      {/* Color dot */}
      <div style={{ position: "relative" }}>
        <button onClick={() => { closeAll(); setColorOpen(s => !s); }} style={{
          width: 38, height: 38, borderRadius: "50%", background: color,
          border: dark ? "3.5px solid rgba(255,255,255,0.15)" : "3.5px solid rgba(255,255,255,0.95)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          cursor: "pointer", outline: colorOpen ? "2px solid var(--accent)" : "none", outlineOffset: 2,
        }}/>
        {colorOpen && <ColorPickerPopover color={color} onChange={setColor} onClose={() => setColorOpen(false)}/>}
      </div>

      {/* Width */}
      <div style={{ position: "relative" }}>
        <button onClick={() => { closeAll(); setWidthOpen(s => !s); }} style={{
          width: 54, height: 38, borderRadius: 12,
          background: widthOpen ? "rgba(92,191,138,0.1)" : "transparent",
          border: widthOpen ? "1.5px solid var(--accent)" : `1.5px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ height: bwLh, width: 34, borderRadius: 99, background: color }}/>
        </button>
        {widthOpen && <WidthPickerPopover widthId={widthId} onChange={id => { setWidthId(id); setWidthOpen(false); }} color={color} onClose={() => setWidthOpen(false)}/>}
      </div>

      <Sep dark={dark}/>

      <IBtn label="↩" title="Undo" disabled={!canUndo} onClick={onUndo} dark={dark}/>
      <IBtn label="↪" title="Redo" disabled={!canRedo} onClick={onRedo} dark={dark}/>

      <Sep dark={dark}/>

      {/* OL size settings */}
      <div style={{ position: "relative" }}>
        <button onClick={() => { closeAll(); setSettingsOpen(s => !s); }} style={{
          width: 36, height: 36, borderRadius: 10, border: "none",
          background: settingsOpen ? "rgba(92,191,138,0.1)" : "transparent",
          cursor: "pointer", fontSize: 16, color: "var(--text3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>⚙️</button>
        {settingsOpen && <OLSettingsPopover olScale={olScale}
          onChangeScale={v => { onChangeScale(v); setOLScale(v); }}
          autoDriveColor={autoDriveColor}
          onToggleAutoDriveColor={onToggleAutoDriveColor}
          onClose={() => setSettingsOpen(false)}/>}
      </div>
    </div>
  );
}

function Sep({ dark }) {
  return <div style={{ width: 1, height: 32, background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", margin: "0 6px" }}/>;
}
function IBtn({ label, disabled, onClick, title, dark }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      width: 38, height: 38, borderRadius: 10, border: "none",
      background: "transparent", cursor: disabled ? "default" : "pointer",
      fontSize: 18, opacity: disabled ? 0.25 : 1, color: dark ? "var(--text2)" : "#333",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{label}</button>
  );
}

// ═══════════════════════════════════════════════════════
// TOP NAV
// ═══════════════════════════════════════════════════════
function TopNav({ playIdx, totalPlays, liveRow, manual, onPrev, onNext, onAdd, onResetView, onSave, saveState }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const drive = getField(liveRow, "DRIVE");
  const down  = (manual?.down) || getField(liveRow, "DN", "DOWN", "Down");
  const dist  = (manual?.dist) || getField(liveRow, "DISTANCE", "DIST", "YDS TO GO");

  const saveBg    = saveState === "ok"  ? "#22C55E"
                  : saveState === "err" ? "#EF4444"
                  : saveState === "saving" ? "#6B7280"
                  : "var(--accent)";
  const saveLabel = saveState === "ok"  ? "✓ Saved"
                  : saveState === "err" ? "✗ Error"
                  : saveState === "saving" ? "…"
                  : "💾 Save";

  const pill = {
    background: dark ? "rgba(22,22,22,0.94)" : "rgba(255,255,255,0.92)",
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: dark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.9)",
    borderRadius: 22,
    boxShadow: dark ? "0 4px 24px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.14)",
    zIndex: 100, whiteSpace: "nowrap",
    fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
  };

  return (
    <>
      {/* ── Centre pill: play selector + Down & Distance ── */}
      <div style={{
        ...pill,
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
      }}>
        <NavArrow dir="‹" disabled={playIdx === 0} onClick={onPrev} dark={dark}/>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>
            Play {playIdx + 1} / {totalPlays}{drive ? ` · D${drive}` : ""}
          </span>
          {down && (
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", lineHeight: 1.1 }}>
              {down}{dist ? <span style={{ color: "var(--text3)", fontWeight: 700 }}> &amp; {dist}</span> : ""}
            </span>
          )}
        </div>

        <NavArrow dir="›" disabled={playIdx >= totalPlays - 1} onClick={onNext} dark={dark}/>
      </div>

      {/* ── Top-right pill: New + Save ── */}
      <div style={{
        ...pill,
        position: "absolute", top: 14, right: 14,
        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
      }}>
        <button onClick={onResetView} title="Reset zoom" style={{
          width: 34, height: 34, borderRadius: 10, border: "none",
          background: "transparent", cursor: "pointer", fontSize: 16, color: "var(--text3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>⊙</button>

        <button onClick={onAdd} style={{
          padding: "7px 14px", borderRadius: 12,
          border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          background: "transparent", color: "var(--accent)", fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>+ New</button>

        <button
          onClick={onSave}
          disabled={saveState === "saving"}
          style={{
            padding: "7px 16px", borderRadius: 12, border: "none",
            background: saveBg, color: "#fff",
            fontSize: 14, fontWeight: 700, cursor: saveState === "saving" ? "default" : "pointer",
            transition: "background .2s", minWidth: 80,
          }}
        >{saveLabel}</button>
      </div>
    </>
  );
}

function NavArrow({ dir, disabled, onClick, dark }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: 40, height: 40, borderRadius: 10, border: "none",
      background: "transparent", fontSize: 26, fontWeight: 700,
      color: disabled ? "var(--text3)" : "var(--text)", cursor: disabled ? "default" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{dir}</button>
  );
}
function InfoPill({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 8.5, color: "var(--text3)", fontWeight: 700, letterSpacing: .5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RIGHT BAR — Formation & Backfield
// ═══════════════════════════════════════════════════════
function RightBar({ liveRow, manual, onManual, prepForms, prepBFs }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const bg     = dark ? "rgba(18,18,18,0.93)" : "rgba(255,255,255,0.92)";
  const border = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";

  const effForm = manual?.form || getField(liveRow, "OFF FORM", "FORMATION");
  const effBF   = manual?.bf   || getField(liveRow, "BACKFIELD");

  const btnBase = (active) => ({
    width: "100%", padding: "5px 8px", borderRadius: 7, border: "none", cursor: "pointer",
    background: active ? "var(--accent)" : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
    color: active ? "#fff" : "var(--text2)",
    fontSize: 11, fontWeight: active ? 700 : 500,
    textAlign: "left", transition: "background .12s",
  });

  if (!prepForms.length && !prepBFs.length) return null;

  return (
    <div style={{
      position: "absolute", top: 70, right: 14, bottom: 80,
      width: 150,
      background: bg,
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border, borderRadius: 16,
      boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.1)",
      zIndex: 50, display: "flex", flexDirection: "column",
      fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
      pointerEvents: "auto", overflow: "hidden",
    }}>
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 8px" }}>

        {/* FORMATION */}
        {prepForms.length > 0 && (
          <>
            <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, textTransform: "uppercase", marginBottom: 5 }}>Formation</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 12 }}>
              {prepForms.map(f => (
                <button key={f} style={btnBase(effForm === f)}
                  onClick={() => onManual("form", effForm === f ? "" : f)}>
                  {f}
                </button>
              ))}
            </div>
          </>
        )}

        {/* BACKFIELD */}
        {prepBFs.length > 0 && (
          <>
            <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, textTransform: "uppercase", marginBottom: 5 }}>Backfield</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {prepBFs.map(b => (
                <button key={b} style={btnBase(effBF === b)}
                  onClick={() => onManual("bf", effBF === b ? "" : b)}>
                  {b}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLAY INFO OVERLAY (left panel, draw mode)
// ═══════════════════════════════════════════════════════
const PERS_OPTIONS = ["10","11","12","13","20","21","22","23"];

function PlayInfoOverlay({ liveRow, manual, onManual }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const overlayBg     = dark ? "rgba(18,18,18,0.93)" : "rgba(255,255,255,0.92)";
  const overlayBorder = dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";

  // Effective values: manual overrides liveRow
  const liveDown  = getField(liveRow, "DN", "DOWN", "Down");
  const liveDist  = getField(liveRow, "DIST", "DISTANCE", "YDS TO GO");
  const livePers  = getField(liveRow, "PERSONNEL", "PERS");
  const liveDrive = getField(liveRow, "DRIVE");
  const effDown   = manual?.down  || liveDown;
  const effDist   = manual?.dist  !== undefined ? manual.dist  : liveDist;
  const effPers   = manual?.pers  || livePers;
  const effDrive  = manual?.drive !== undefined ? manual.drive : liveDrive;
  const effForm   = manual?.form  || getField(liveRow, "OFF FORM", "FORMATION");
  const effBF     = manual?.bf    || getField(liveRow, "BACKFIELD");

  // Remaining liveRow fields for display only (not editable here)
  const hash  = getField(liveRow, "HASH", "HASH POSITION");
  const livePT= getField(liveRow, "PLAY TYPE CALLED", "PLAY TYPE");
  const effPT = manual?.pt || livePT;
  const play  = getField(liveRow, "OFF PLAY", "PLAY NAME", "PLAY CALL");
  const fRte  = getField(liveRow, "F ROUTES", "F ROUTE");
  const bRte  = getField(liveRow, "B ROUTES", "B ROUTE");
  const drive = effDrive;
  const mo    = getField(liveRow, "MOTION");

  // Box button style factory
  const box = (active) => ({
    width: 38, height: 38, borderRadius: 9, border: "none",
    background: active ? "var(--accent)" : (dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
    color: active ? "#fff" : "var(--text2)",
    fontSize: 15, fontWeight: 800, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", flexShrink: 0,
    transition: "background .12s",
  });

  const distNum  = parseInt(effDist)  || 0;
  const driveNum = parseInt(effDrive) || 0;

  return (
    <div style={{
      position: "absolute", top: 70, left: 14,
      background: overlayBg, backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16, padding: "12px 12px 10px",
      boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.1)",
      border: overlayBorder,
      zIndex: 50, width: 108,
      fontFamily: "-apple-system,BlinkMacSystemFont,sans-serif",
      pointerEvents: "auto",
    }}>

      {/* ── DOWN selector 2×2 ── */}
      <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, marginBottom: 5, textTransform: "uppercase" }}>Down</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
        {[1,2,3,4].map(d => {
          const sel = effDown === String(d);
          return (
            <button key={d} style={box(sel)}
              onClick={() => onManual("down", sel ? "" : String(d))}>
              {d}
            </button>
          );
        })}
      </div>

      {/* ── DISTANCE stepper ── */}
      <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, marginBottom: 5, textTransform: "uppercase" }}>Distance</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
        <button
          style={{ ...box(false), width: 28, height: 28, fontSize: 18, borderRadius: 7 }}
          onClick={() => onManual("dist", String(Math.max(1, distNum - 1)))}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 900, color: "var(--accent)", lineHeight: 1 }}>
          {effDist || "–"}
        </div>
        <button
          style={{ ...box(false), width: 28, height: 28, fontSize: 18, borderRadius: 7 }}
          onClick={() => onManual("dist", String(distNum + 1))}>+</button>
      </div>

      {/* ── DRIVE stepper ── */}
      <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, marginBottom: 5, textTransform: "uppercase" }}>Drive</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
        <button
          style={{ ...box(false), width: 28, height: 28, fontSize: 18, borderRadius: 7 }}
          onClick={() => onManual("drive", String(Math.max(1, driveNum - 1)))}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
          {effDrive || "–"}
        </div>
        <button
          style={{ ...box(false), width: 28, height: 28, fontSize: 18, borderRadius: 7 }}
          onClick={() => onManual("drive", String(driveNum + 1))}>+</button>
      </div>

      {/* ── PERSONNEL boxes ── */}
      <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, marginBottom: 5, textTransform: "uppercase" }}>Personnel</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
        {PERS_OPTIONS.map(p => {
          const sel = effPers === p;
          return (
            <button key={p} style={{ ...box(sel), width: "100%", height: 32, fontSize: 13 }}
              onClick={() => onManual("pers", sel ? "" : p)}>
              {p}
            </button>
          );
        })}
      </div>

      {/* ── PLAY TYPE hot buttons ── */}
      <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .6, marginBottom: 5, textTransform: "uppercase" }}>Play Type</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
        {[
          { val: "run",  label: "RUN",  color: "var(--run-color)"  },
          { val: "pass", label: "PASS", color: "var(--pass-color)" },
          { val: "rpo",  label: "RPO",  color: "var(--rpo-color)"  },
        ].map(({ val, label, color }) => {
          const active = (effPT || "").toLowerCase() === val;
          return (
            <button
              key={val}
              onClick={() => onManual("pt", active ? "" : val)}
              style={{
                width: "100%", padding: "7px 0", borderRadius: 9,
                border: active ? "none" : `1.5px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                background: active ? color : "transparent",
                color: active ? "#fff" : (dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.4)"),
                fontSize: 12, fontWeight: 800, letterSpacing: 1,
                cursor: "pointer", transition: "background .12s, color .12s",
              }}
            >{label}</button>
          );
        })}
      </div>

      {/* ── Hash dots (from live) ── */}
      {hash && <><HashDots hash={hash}/><div style={{ marginBottom: 8 }}/></>}

      {/* ── Remaining live fields ── */}
      {liveRow && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            play  && { lbl: "PLAY",  val: play  },
            fRte  && { lbl: "F RTE", val: fRte  },
            bRte  && { lbl: "B RTE", val: bRte  },
            drive && { lbl: "DRV",   val: drive },
            mo    && { lbl: "MOT",   val: mo    },
          ].filter(Boolean).map(({ lbl, val }) => (
            <div key={lbl}>
              <div style={{ fontSize: 8, color: "var(--text3)", fontWeight: 700, letterSpacing: .5, textTransform: "uppercase" }}>{lbl}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", wordBreak: "break-word" }}>{val}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HashDots({ hash }) {
  const h = String(hash).toUpperCase();
  const a = h.startsWith("L") ? 0 : h.startsWith("R") ? 2 : 1;
  return (
    <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
      {["L","M","R"].map((lbl, i) => (
        <div key={lbl} style={{
          width: 20, height: 20, borderRadius: "50%",
          background: i === a ? "var(--accent)" : "var(--surface2)",
          color: i === a ? "#fff" : "var(--text3)",
          fontSize: 9, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{lbl}</div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MINI CANVAS (viewer card + overview)
// ═══════════════════════════════════════════════════════
function MiniCanvas({ strokes, olScale }) {
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <FieldBG/>
      <OLTemplate scale={olScale}/>
      {strokes.map((s, i) => <StrokeEl key={i} stroke={s}/>)}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// VIEWER TAB
// ═══════════════════════════════════════════════════════
export function DrawingsViewer({ liveRows, drawings, totalPlays, onSelectPlay, onDeleteDrawing, olScale }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [drive, setDrive] = useState("all");

  const drives = useMemo(() => {
    const s = new Set();
    (liveRows ?? []).forEach(r => { const d = getField(r, "DRIVE"); if (d) s.add(d); });
    return [...s].sort((a, b) => +a - +b);
  }, [liveRows]);

  const plays = Array.from({ length: totalPlays }, (_, i) => ({
    idx: i, liveRow: (liveRows ?? [])[i] ?? null, strokes: drawings[i + 1] ?? [],
  })).filter(p => drive === "all" || getField(p.liveRow, "DRIVE") === drive);

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "80px 20px 20px" }}>
      {/* Drive filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {["all", ...drives].map(d => (
          <button key={d} onClick={() => setDrive(d)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: drive === d ? "var(--accent)" : "var(--surface2)",
            color: drive === d ? "#fff" : "var(--text2)", border: "none", cursor: "pointer",
          }}>{d === "all" ? "All Plays" : `Drive ${d}`}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
        {plays.map(({ idx, liveRow, strokes }) => {
          const down = getField(liveRow, "DN", "DOWN", "Down");
          const dist = getField(liveRow, "DISTANCE", "DIST");
          const pt   = getField(liveRow, "PLAY TYPE CALLED", "PLAY TYPE");
          const form = getField(liveRow, "OFF FORM", "FORMATION");
          const drv  = getField(liveRow, "DRIVE");
          const pers = getField(liveRow, "PERSONNEL", "PERS");

          return (
            <div key={idx} style={{
              borderRadius: 14, overflow: "visible", cursor: "pointer",
              border: `1px solid var(--border)`,
              boxShadow: dark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)",
              background: "var(--surface)",
              transition: "box-shadow .15s, transform .15s",
              position: "relative",
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow= dark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.14)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow= dark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="none"; }}
            >
              {/* Delete button */}
              {onDeleteDrawing && strokes.length > 0 && (
                <button onClick={e => { e.stopPropagation(); onDeleteDrawing(idx + 1); }} style={{
                  position: "absolute", top: -8, right: -8, zIndex: 10,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#FF3B30", color: "#fff",
                  border: "2px solid var(--surface)", cursor: "pointer",
                  fontSize: 11, fontWeight: 900,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}>✕</button>
              )}

              {/* Header */}
              <div onClick={() => onSelectPlay && onSelectPlay(idx)} style={{
                padding: "8px 12px", background: "var(--surface2)", color: "var(--text)", borderRadius: "14px 14px 0 0",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Play {idx + 1}</span>
                  {drv && <span style={{ fontSize: 10, opacity: .6 }}>Drive {drv}</span>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {pers && <span style={{ fontSize: 10, opacity: .75, fontWeight: 600 }}>{pers}</span>}
                  {down && <span style={{ fontSize: 12, fontWeight: 700 }}>{down}{dist ? ` & ${dist}` : ""}</span>}
                  {form && <span style={{ fontSize: 10, opacity: .8, fontWeight: 600, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>{form}</span>}
                  {pt && (
                    <span style={{ padding: "2px 8px", borderRadius: 10, background: ptColor(pt), color: "#fff", fontSize: 10, fontWeight: 800 }}>
                      {pt.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Mini canvas */}
              <div onClick={() => onSelectPlay && onSelectPlay(idx)} style={{ background: "#fff", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
                <MiniCanvas strokes={strokes} olScale={olScale}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function Drawings() {
  const { selectedGame, liveRows: rawLive, playRows, sidebarOpen } = useApp();
  const sideW = sidebarOpen ? 200 : 36;
  const live = useMemo(() => Array.isArray(rawLive) ? rawLive : [], [rawLive]);

  const [searchParams, setSearchParams] = useSearchParams();
  const tab    = searchParams.get("tab") === "viewer" ? "viewer" : "draw";
  const setTab = (t) => setSearchParams(t === "viewer" ? { tab: "viewer" } : {}, { replace: true });
  const [playIdx,    setPlayIdxRaw] = useState(0);
  const [jumpToLast, setJumpToLast] = useState(false);
  const [totalPlays, setTotalPlays] = useState(1);
  // Shared play pointer — sync ref prevents echo-back of own pushes
  const sharedPlayRef    = useRef(null);  // last server value we know about
  const localPushRef     = useRef(false); // true right after we push a change
  const initialJumpDone  = useRef(false); // blocks poll until first jump-to-last PUT completes

  // Navigate to a play AND broadcast to all users
  const setPlayIdx = useCallback((idxOrFn) => {
    setPlayIdxRaw(prev => {
      const next = typeof idxOrFn === "function" ? idxOrFn(prev) : idxOrFn;
      if (next !== prev && selectedGame?.id) {
        localPushRef.current = true;
        sharedPlayRef.current = next;
        apiPutDrawingState(selectedGame.id, next)
          .finally(() => { localPushRef.current = false; });
      }
      return next;
    });
  }, [selectedGame?.id]);
  const [drawings,   setDrawings]   = useState({});
  // Drawing tool settings — persisted per user in localStorage
  const [tool,           setToolState]          = useState(() => {
    const t = localStorage.getItem("dl_draw_tool") || "pen";
    return ["pen","marker","eraser-el","eraser-px"].includes(t) ? t : "pen";
  });
  const [color,          setColorState]         = useState(() => localStorage.getItem("dl_draw_color")      || PALETTE[0]);
  const [widthId,        setWidthState]         = useState(() => localStorage.getItem("dl_draw_width")      || "sm");
  const [autoDriveColor, setAutoDriveColorState]= useState(() => localStorage.getItem("dl_draw_auto_drive") === "true");
  const [olScale,        setOLScaleState]       = useState(getOLScale());
  const [saveState,      setSaveState]          = useState("idle"); // "idle"|"saving"|"ok"|"err"

  // Persisting wrappers
  const setTool    = v => { localStorage.setItem("dl_draw_tool",        v); setToolState(v); };
  const setColor   = v => { localStorage.setItem("dl_draw_color",       v); setColorState(v); };
  const setWidthId = v => { localStorage.setItem("dl_draw_width",       v); setWidthState(v); };
  const setAutoDriveColor = v => {
    localStorage.setItem("dl_draw_auto_drive", String(v));
    setAutoDriveColorState(v);
    apiSaveUserSettings({ auto_drive_color: v }).catch(() => {});
  };

  // Load per-user settings from server on mount (overrides local default)
  useEffect(() => {
    apiGetUserSettings().then(s => {
      if (s.auto_drive_color !== undefined) {
        const val = Boolean(s.auto_drive_color);
        localStorage.setItem("dl_draw_auto_drive", String(val));
        setAutoDriveColorState(val);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line

  // Drive auto-color — switch once per drive when feature is active
  const lastAutoDriveRef = useRef(null);
  const drawingsRef  = useRef({});

  const svgRef          = useRef(null);
  const drawPtrRef      = useRef(null);
  const currentPtsRef   = useRef([]);
  const [livePath, setLivePath] = useState({ d: "", tool: "pen", bw: 5 });

  const undoRef = useRef([]);
  const redoRef = useRef([]);

  const viewRef = useRef({ tx: 0, ty: 0, s: 1 });
  const [view, setView] = useState({ tx: 0, ty: 0, s: 1 });
  const updateView = v => { viewRef.current = v; setView(v); };

  const ptMapRef   = useRef(new Map());
  const gestureRef = useRef(null);
  const [eraserPos, setEraserPos] = useState(null);
  const saveTimer  = useRef(null);

  // Manual overrides per play index (if live tagging is behind)
  const [manualMeta, setManualMeta] = useState({});
  const pendingPatchRef = useRef({}); // { [playIdx]: {fields, retryTimer} }

  // Map manual keys → live_rows field names
  const MANUAL_FIELD_MAP = { down: "DN", dist: "DIST", pers: "PERSONNEL", drive: "DRIVE", form: "OFF FORM", bf: "BACKFIELD", pt: "PLAY TYPE CALLED" };

  const setManual = (idx, key, val) => {
    setManualMeta(prev => {
      const next = { ...prev, [idx]: { ...(prev[idx] ?? {}), [key]: val } };
      // Sync to server (with retry if row doesn't exist yet)
      syncManualToServer(idx, next[idx] ?? {});
      return next;
    });
  };

  const syncManualToServer = useCallback((idx, meta) => {
    if (!selectedGame?.id) return;
    // Build fields object
    const fields = {};
    Object.entries(meta).forEach(([k, v]) => {
      const f = MANUAL_FIELD_MAP[k];
      if (f && v !== "") fields[f] = v;
    });
    if (Object.keys(fields).length === 0) return;

    // Auto-compute DOWN GROUP whenever DN or DIST is known
    const dn   = fields["DN"]   || "";
    const dist = fields["DIST"] || "";
    if (dn) {
      const dg = buildDownGroup(dn, dist);
      if (dg) fields["DOWN GROUP"] = dg;
    }

    // Clear existing retry timer for this play
    if (pendingPatchRef.current[idx]?.timer) {
      clearTimeout(pendingPatchRef.current[idx].timer);
    }

    const tryPatch = async () => {
      try {
        await apiPatchLiveRow(selectedGame.id, idx, fields);
        delete pendingPatchRef.current[idx];
      } catch {
        // Row doesn't exist yet — retry in 2 seconds
        pendingPatchRef.current[idx] = {
          fields,
          timer: setTimeout(tryPatch, 2000),
        };
      }
    };
    tryPatch();
  }, [selectedGame?.id]);

  // Cancel all pending retries on game change
  useEffect(() => {
    return () => {
      Object.values(pendingPatchRef.current).forEach(p => {
        if (p?.timer) clearTimeout(p.timer);
      });
      pendingPatchRef.current = {};
    };
  }, [selectedGame?.id]);

  // ── Poll shared play pointer every 2 s ──────────────────────────────────────
  useEffect(() => {
    if (!selectedGame?.id) return;
    // Reset jump gate whenever the game changes
    initialJumpDone.current = false;
    sharedPlayRef.current   = null;
    localPushRef.current    = false;
    // Trigger jump to last play once live data is ready
    setJumpToLast(true);

    // Safety net: unblock poll after 8 s even if live data never arrives
    const safetyTimer = setTimeout(() => { initialJumpDone.current = true; }, 8000);

    const id = setInterval(async () => {
      try {
        // Block until the initial jump-to-last PUT has completed
        if (!initialJumpDone.current) return;
        // Block while we're in the middle of pushing our own change
        if (localPushRef.current) return;
        const s = await apiGetDrawingState(selectedGame.id);
        if (s.play_idx >= 0 && s.play_idx !== sharedPlayRef.current) {
          sharedPlayRef.current = s.play_idx;
          setPlayIdxRaw(s.play_idx);
        }
      } catch {}
    }, 2000);
    return () => { clearInterval(id); clearTimeout(safetyTimer); };
  }, [selectedGame?.id]);

  // Jump to last play once live data is available
  useEffect(() => {
    if (!jumpToLast || live.length === 0 || !selectedGame?.id) return;
    const lastIdx = live.length - 1;
    sharedPlayRef.current = lastIdx;
    localPushRef.current  = true;
    setPlayIdxRaw(lastIdx);
    setJumpToLast(false);
    apiPutDrawingState(selectedGame.id, lastIdx)
      .finally(() => {
        localPushRef.current   = false;
        initialJumpDone.current = true; // unblock the poll only after PUT completes
      });
  }, [jumpToLast, live.length, selectedGame?.id]);

  const effectiveTotal = Math.max(totalPlays, live.length, playIdx + 1);
  const playKey        = playIdx + 1;
  const liveRow        = live[playIdx] ?? null;
  const manual         = manualMeta[playIdx] ?? {};

  // Auto drive color — switch pen color once per drive when feature is active
  // Must live here, after liveRow + manual are defined
  useEffect(() => {
    if (!autoDriveColor) return;
    const drive = manual?.drive || getField(liveRow, "DRIVE");
    if (!drive) return;
    if (drive === lastAutoDriveRef.current) return;
    lastAutoDriveRef.current = drive;
    const driveNum = parseInt(drive, 10) || 1;
    const newColor = DRIVE_PALETTE[(driveNum - 1) % DRIVE_PALETTE.length];
    setColor(newColor);
  }, [autoDriveColor, liveRow, manual?.drive]); // eslint-disable-line

  // Unique formations + backfields from prep data, sorted by frequency
  const prepForms = useMemo(() => {
    const counts = {};
    [...(playRows ?? []), ...(live ?? [])].forEach(r => {
      const v = String(r["OFF FORM"] ?? "").trim();
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([v]) => v);
  }, [playRows, live]);

  const prepBFs = useMemo(() => {
    const counts = {};
    [...(playRows ?? []), ...(live ?? [])].forEach(r => {
      const v = String(r["BACKFIELD"] ?? "").trim();
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([v]) => v);
  }, [playRows, live]);
  const currentStrokes = drawings[playKey] ?? [];
  const bw             = WIDTHS.find(w => w.id === widthId)?.bw ?? 5;

  const handleOLScale = v => { setOLScaleState(v); setOLScale(v); };

  // Keep a ref always in sync with drawings state (for save-all without stale closures)
  const setDrawingsSync = (updater) => {
    setDrawings(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      drawingsRef.current = next;
      return next;
    });
  };

  // ── Load drawings ──
  useEffect(() => {
    if (!selectedGame) { setDrawingsSync({}); setTotalPlays(1); setPlayIdxRaw(0); return; }
    apiGetDrawings(selectedGame.id).then(data => {
      const map = {}; let mx = 0;
      data.forEach(d => { map[d.play_index] = d.strokes; if (d.play_index > mx) mx = d.play_index; });
      setDrawingsSync(map);
      setTotalPlays(t => Math.max(t, mx, live.length, 1));
      // Do NOT call setPlayIdx here — it would broadcast play_idx=0 to the server
      // and race against the jumpToLast PUT. The play index is managed exclusively
      // by jumpToLast (initial load) and the interval poll (live sync).
    }).catch(() => {});
  }, [selectedGame?.id]); // eslint-disable-line

  // Immediate save — called on stroke completion and undo/redo
  const save = useCallback((key, strokes) => {
    if (!selectedGame) return;
    apiSaveDrawing(selectedGame.id, key, strokes).catch(() => {});
  }, [selectedGame]);

  // Debounced save — only used by eraser which fires on every pointer-move
  const saveDebounced = useCallback((key, strokes) => {
    if (!selectedGame) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiSaveDrawing(selectedGame.id, key, strokes).catch(() => {});
    }, 400);
  }, [selectedGame]);

  const isDirtyRef = useRef(false);

  const commitStrokes = useCallback((key, strokes, { debounce = false } = {}) => {
    setDrawingsSync(d => ({ ...d, [key]: strokes }));
    isDirtyRef.current = true;
    if (debounce) saveDebounced(key, strokes);
    else save(key, strokes);
  }, [save, saveDebounced]);

  // ── Save All — saves every play with strokes to server ──
  const handleSaveAll = useCallback(async ({ silent = false } = {}) => {
    if (!selectedGame) return;
    if (!silent) setSaveState("saving");
    const entries = Object.entries(drawingsRef.current).filter(([, strokes]) => strokes.length > 0);
    try {
      await Promise.all(
        entries.map(([key, strokes]) => apiSaveDrawing(selectedGame.id, Number(key), strokes))
      );
      isDirtyRef.current = false;
      if (!silent) { setSaveState("ok"); setTimeout(() => setSaveState("idle"), 2000); }
    } catch {
      if (!silent) { setSaveState("err"); setTimeout(() => setSaveState("idle"), 3000); }
    }
  }, [selectedGame]);

  // ── Auto-save every 500ms when dirty ──
  useEffect(() => {
    if (!selectedGame) return;
    const id = setInterval(() => {
      if (isDirtyRef.current) handleSaveAll({ silent: true });
    }, 500);
    return () => clearInterval(id);
  }, [selectedGame?.id, handleSaveAll]);

  // ── Poll drawings every 5 s — real-time sharing across all devices ──
  useEffect(() => {
    if (!selectedGame) return;
    const poll = setInterval(() => {
      if (drawPtrRef.current !== null) return; // skip while user is actively drawing
      apiGetDrawings(selectedGame.id).then(data => {
        const map = {}; let mx = 0;
        data.forEach(d => { map[d.play_index] = d.strokes; if (d.play_index > mx) mx = d.play_index; });
        setDrawingsSync(map);
        setTotalPlays(t => Math.max(t, mx, live.length, 1));
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(poll);
  }, [selectedGame?.id]); // eslint-disable-line

  // ── Delete drawing ──
  const deleteDrawing = useCallback((key) => {
    setDrawingsSync(d => { const n = { ...d }; delete n[key]; return n; });
    if (selectedGame) apiDeleteDrawing(selectedGame.id, key).catch(() => {});
  }, [selectedGame]);

  // ── Undo / Redo ──
  const pushUndo = prev => { undoRef.current = [...undoRef.current, prev]; redoRef.current = []; };
  const undo = () => {
    if (!undoRef.current.length) return;
    const prev = undoRef.current.at(-1);
    undoRef.current = undoRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, currentStrokes];
    commitStrokes(playKey, prev);
  };
  const redo = () => {
    if (!redoRef.current.length) return;
    const next = redoRef.current.at(-1);
    redoRef.current = redoRef.current.slice(0, -1);
    undoRef.current = [...undoRef.current, currentStrokes];
    commitStrokes(playKey, next);
  };

  // ── Coordinates ──
  const clientToSVG = (cx, cy) => {
    const svg = svgRef.current;
    if (!svg) return { x: cx, y: cy };
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  const clientToCanvas = (cx, cy) => {
    const { x, y } = clientToSVG(cx, cy);
    const v = viewRef.current;
    return { x: (x - v.tx) / v.s, y: (y - v.ty) / v.s };
  };

  // ── Pointer events ──
  const onPointerDown = e => {
    ptMapRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY, type: e.pointerType });
    const touches = [...ptMapRef.current.values()].filter(p => p.type === "touch");
    if (touches.length >= 2) {
      drawPtrRef.current = null; currentPtsRef.current = [];
      setLivePath({ d: "", tool, bw });
      startGesture(); return;
    }
    if (drawPtrRef.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawPtrRef.current = e.pointerId;
    const pt = clientToCanvas(e.clientX, e.clientY);
    currentPtsRef.current = [{ ...pt, p: e.pressure > 0 ? e.pressure : 0.5 }];
    if (!isEraser(tool)) setLivePath({ d: `M${pt.x},${pt.y}`, tool, bw });
  };

  const onPointerMove = e => {
    ptMapRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY, type: e.pointerType });
    e.preventDefault();
    const touches = [...ptMapRef.current.values()].filter(p => p.type === "touch");
    if (touches.length >= 2 && gestureRef.current) { updateGesture(); return; }

    // Always track eraser position for cursor circle (even on hover, not just drag)
    if (isEraser(tool)) {
      const pt = clientToCanvas(e.clientX, e.clientY);
      setEraserPos(pt);
      if (e.pointerId === drawPtrRef.current) {
        const strokes = drawings[playKey] ?? [];
        const r = ERASER_R / viewRef.current.s;
        if (tool === "eraser-el") {
          const hit = strokes.filter(s => !hitTest(s, pt.x, pt.y, r));
          if (hit.length !== strokes.length) { pushUndo(strokes); commitStrokes(playKey, hit, { debounce: true }); }
        } else {
          const result = erasePoints(strokes, pt.x, pt.y, r);
          if (result) { pushUndo(strokes); commitStrokes(playKey, result, { debounce: true }); }
        }
      }
      return;
    }

    if (e.pointerId !== drawPtrRef.current) return;
    const pt = clientToCanvas(e.clientX, e.clientY);
    const last = currentPtsRef.current.at(-1);
    const dx = pt.x - last.x, dy = pt.y - last.y;
    if (dx * dx + dy * dy < 3) return;
    currentPtsRef.current.push({ ...pt, p: 0.5 });
    const pts = currentPtsRef.current;
    setLivePath({ d: buildSmoothPath(pts), tool, bw });
  };

  const onPointerUp = e => {
    ptMapRef.current.delete(e.pointerId);
    if (gestureRef.current) {
      if ([...ptMapRef.current.values()].filter(p => p.type === "touch").length < 2) gestureRef.current = null;
    }
    if (e.pointerId !== drawPtrRef.current) return;
    drawPtrRef.current = null;
    setLivePath({ d: "", tool, bw });
    setEraserPos(null);
    if (isEraser(tool)) {
      clearTimeout(saveTimer.current);
      const strokes = drawings[playKey] ?? [];
      save(playKey, strokes);
      return;
    }
    const pts = currentPtsRef.current; currentPtsRef.current = [];
    if (pts.length < 2) return;
    const pathD = buildSmoothPath(pts);
    const stroke = { tool, color, bw, points: pts, pathD };
    const prev = drawings[playKey] ?? [];
    pushUndo(prev);
    commitStrokes(playKey, [...prev, stroke]);
  };

  const onPointerCancel = e => {
    ptMapRef.current.delete(e.pointerId);
    if (e.pointerId === drawPtrRef.current) {
      drawPtrRef.current = null; currentPtsRef.current = [];
      setLivePath({ d: "", tool, bw }); setEraserPos(null);
    }
    if (gestureRef.current && [...ptMapRef.current.values()].filter(p => p.type === "touch").length < 2)
      gestureRef.current = null;
  };

  // ── Gestures ──
  function startGesture() {
    const pts = getTouchSVGPts(); if (pts.length < 2) return;
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    gestureRef.current = { startDist: Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y), startMid: mid, startView: { ...viewRef.current } };
  }
  function updateGesture() {
    if (!gestureRef.current) return;
    const pts = getTouchSVGPts(); if (pts.length < 2) { gestureRef.current = null; return; }
    const { startDist, startMid, startView } = gestureRef.current;
    const currMid  = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const currDist = Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y);
    const newS = clamp(startView.s * currDist / startDist, 0.25, 6);
    const newTx = startMid.x - (startMid.x - startView.tx) * newS / startView.s + (currMid.x - startMid.x);
    const newTy = startMid.y - (startMid.y - startView.ty) * newS / startView.s + (currMid.y - startMid.y);
    updateView({ tx: newTx, ty: newTy, s: newS });
  }
  function getTouchSVGPts() {
    return [...ptMapRef.current.entries()].filter(([,p]) => p.type === "touch").map(([,p]) => clientToSVG(p.clientX, p.clientY));
  }

  const onWheel = useCallback(e => {
    e.preventDefault();
    const { x: cx, y: cy } = clientToSVG(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const v = viewRef.current;
    const newS = clamp(v.s * factor, 0.25, 6);
    updateView({ tx: cx - (cx - v.tx) * newS / v.s, ty: cy - (cy - v.ty) * newS / v.s, s: newS });
  }, []); // eslint-disable-line

  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  if (!selectedGame) return (
    <div style={{ padding: 40, color: "#999", fontSize: 15 }}>No game selected.</div>
  );

  return (
    <div style={{
      position: "fixed", top: 0, bottom: 0, left: sideW, right: 0,
      overflow: "hidden",
      background: "var(--bg2)",
      userSelect: "none",
      fontFamily: "-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif",
    }}>

      {/* ═══ DRAW TAB ═══ */}
      {tab === "draw" && (
        <>
          <TopNav
            playIdx={playIdx} totalPlays={effectiveTotal} liveRow={liveRow} manual={manual}
            onPrev={() => setPlayIdx(i => Math.max(0, i - 1))}
            onNext={() => setPlayIdx(i => Math.min(effectiveTotal - 1, i + 1))}
            onAdd={() => {
              const newIdx = effectiveTotal;
              setTotalPlays(effectiveTotal + 1);
              setPlayIdx(newIdx);
              // Create the row in live_rows so LiveTagging sees it immediately
              if (selectedGame?.id) {
                apiPatchLiveRow(selectedGame.id, newIdx, { 'PLAY #': String(newIdx + 1), 'ODK': 'O' }).catch(() => {});
              }
            }}
            onResetView={() => updateView({ tx: 0, ty: 0, s: 1 })}
            onSave={handleSaveAll} saveState={saveState}
          />
          <PlayInfoOverlay liveRow={liveRow} manual={manual}
            prepForms={prepForms} prepBFs={prepBFs}
            onManual={(key, val) => setManual(playIdx, key, val)}/>
          <RightBar liveRow={liveRow} manual={manual}
            prepForms={prepForms} prepBFs={prepBFs}
            onManual={(key, val) => setManual(playIdx, key, val)}/>

          <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            background: "var(--surface)", cursor: isEraser(tool) ? "none" : "crosshair",
            touchAction: "none", display: "block",
          }}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}     onPointerCancel={onPointerCancel}
            onPointerLeave={onPointerCancel}
          >
            <g transform={`translate(${view.tx},${view.ty}) scale(${view.s})`}>
              <FieldBG/>
              <OLTemplate scale={olScale}/>
              {currentStrokes.map((s, i) => <StrokeEl key={i} stroke={s}/>)}
              {livePath.d && (
                <path d={livePath.d} fill="none" stroke={color} strokeWidth={livePath.bw}
                  strokeLinecap="round" strokeLinejoin="round"
                  opacity={livePath.tool === "marker" ? 0.55 : 1}
                  style={{ pointerEvents: "none" }}/>
              )}
              {isEraser(tool) && eraserPos && (
                <g style={{ pointerEvents: "none" }}>
                  <circle cx={eraserPos.x} cy={eraserPos.y} r={ERASER_R / view.s}
                    fill={tool === "eraser-el" ? "rgba(239,68,68,0.12)" : "rgba(200,200,200,0.2)"}
                    stroke={tool === "eraser-el" ? "rgba(239,68,68,0.6)" : "rgba(100,100,100,0.5)"}
                    strokeWidth={1.5 / view.s}
                    strokeDasharray={tool === "eraser-px" ? `${4/view.s} ${2/view.s}` : "none"}/>
                </g>
              )}
            </g>
          </svg>

          <FloatingToolbar
            tool={tool}       setTool={setTool}
            color={color}     setColor={setColor}
            widthId={widthId} setWidthId={setWidthId}
            canUndo={undoRef.current.length > 0}
            canRedo={redoRef.current.length > 0}
            onUndo={undo} onRedo={redo}
            olScale={olScale} onChangeScale={handleOLScale}
            autoDriveColor={autoDriveColor}
            onToggleAutoDriveColor={() => setAutoDriveColor(!autoDriveColor)}
          />
        </>
      )}

      {/* ═══ VIEWER TAB ═══ */}
      {tab === "viewer" && (
        <div style={{ position: "absolute", inset: 0, background: "var(--bg)", overflowY: "auto" }}>
          <DrawingsViewer
            liveRows={live} drawings={drawings} totalPlays={effectiveTotal} olScale={olScale}
            onSelectPlay={idx => { setPlayIdx(idx); setTab("draw"); }}
            onDeleteDrawing={deleteDrawing}
          />
        </div>
      )}
    </div>
  );
}
