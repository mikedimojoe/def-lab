import { useState, useEffect, useMemo, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { apiGetRoster, apiGetImages } from "../lib/api";
import { computeFormationStats, computePlaytypeStats } from "../lib/dataEngine";
import { getNatBadgeStyle } from "../lib/natStyle";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";

const GREEN      = "#154734";
const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "var(--rpo-color)";

// ── Depth chart positions (mirrors Roster.jsx) ────────────────────────────────
const POSITIONS = [
  { key:"QB",   label:"QB",  col:3, row:0 },
  { key:"RB",   label:"RB",  col:5, row:0 },
  { key:"FB",   label:"FB",  col:3, row:1 },
  { key:"TE",   label:"TE",  col:0, row:2 },
  { key:"SB",   label:"SB",  col:6, row:2 },
  { key:"WR_L", label:"WR",  col:0, row:3 },
  { key:"LT",   label:"LT",  col:1, row:3 },
  { key:"LG",   label:"LG",  col:2, row:3 },
  { key:"C",    label:"C",   col:3, row:3 },
  { key:"RG",   label:"RG",  col:4, row:3 },
  { key:"RT",   label:"RT",  col:5, row:3 },
  { key:"WR_R", label:"WR",  col:6, row:3 },
];
const NUM_COLS = 7;

// ── Roster layout: 3 rows × 5 cols ───────────────────────────────────────────
//  Row 1 — Backfield : QB (col2), FB (col3), RB (col4)
//  Row 2 — Skills    : WR_L (col1), TE (col2), SB (col4), WR_R (col5)
//  Row 3 — OL        : LT (col1), LG (col2), C (col3), RG (col4), RT (col5)
const PRINT_LAYOUT = [
  { key:"QB",   label:"QB",  col:2, row:1 },
  { key:"FB",   label:"FB",  col:3, row:1 },
  { key:"RB",   label:"RB",  col:4, row:1 },
  { key:"WR_L", label:"WR",  col:1, row:2 },
  { key:"TE",   label:"TE",  col:2, row:2 },
  { key:"SB",   label:"SB",  col:4, row:2 },
  { key:"WR_R", label:"WR",  col:5, row:2 },
  { key:"LT",   label:"LT",  col:1, row:3 },
  { key:"LG",   label:"LG",  col:2, row:3 },
  { key:"C",    label:"C",   col:3, row:3 },
  { key:"RG",   label:"RG",  col:4, row:3 },
  { key:"RT",   label:"RT",  col:5, row:3 },
];

// Row group labels shown in the left gutter
const ROW_LABELS = { 1:"Backfield", 2:"Skills", 3:"OL" };

function PosCard({ posKey, label, depth }) {
  const players = (depth[posKey] || []).sort((a,b) => (a.dcPos||99)-(b.dcPos||99));
  return (
    <div style={{ border:"1px solid #ddd", borderRadius:6, overflow:"hidden", fontSize:10 }}>
      <div style={{
        background:GREEN, color:"#fff", fontWeight:800,
        fontSize:10, padding:"4px 0", textTransform:"uppercase",
        letterSpacing:.6, textAlign:"center",
      }}>{label}</div>
      {players.length === 0 ? (
        <div style={{ padding:"4px 8px", color:"#bbb", fontSize:9 }}>—</div>
      ) : players.map((p, i) => {
        const nat3 = (p.nationality || "").toUpperCase().slice(0,3);
        const ns   = getNatBadgeStyle(nat3);
        return (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:4,
            padding:"3px 6px", borderBottom:"1px solid #f0f0f0",
          }}>
            <span style={{ color:"#aaa", fontSize:8, width:16, flexShrink:0, textAlign:"right" }}>
              {p.number ? `#${p.number}` : ""}
            </span>
            {nat3 && (
              <span style={{
                background:ns.bg, color:ns.fg, fontSize:7,
                fontWeight:800, padding:"1px 3px", borderRadius:2, flexShrink:0,
              }}>{nat3}</span>
            )}
            <span style={{ fontWeight:600, color:"#111", fontSize:9, wordBreak:"break-word" }}>
              {[p.lastname, p.firstname].filter(Boolean).join(", ") || "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PrintRoster({ depth }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {[1, 2, 3].map(row => {
        const cols = PRINT_LAYOUT.filter(p => p.row === row);
        return (
          <div key={row} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
            {/* Row label */}
            <div style={{
              width:54, flexShrink:0, paddingTop:6,
              fontSize:8, fontWeight:800, textTransform:"uppercase",
              letterSpacing:.6, color:"#999", textAlign:"right",
            }}>{ROW_LABELS[row]}</div>

            {/* 5-column grid for this row */}
            <div style={{
              flex:1, display:"grid",
              gridTemplateColumns:"repeat(5, 1fr)",
              gap:8,
            }}>
              {/* Place each position at its column (1-indexed) */}
              {Array.from({length:5}, (_,ci) => {
                const pos = cols.find(p => p.col === ci+1);
                return pos
                  ? <PosCard key={pos.key} posKey={pos.key} label={pos.label} depth={depth} />
                  : <div key={ci} />;  // empty cell
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mini run/pass bar ─────────────────────────────────────────────────────────
function MiniBar({ runPct, passPct, rpoPct, h = 5 }) {
  return (
    <div style={{
      display:"flex", height:h, borderRadius:3, overflow:"hidden",
      background:"#eee", gap:1,
    }}>
      {runPct  > 0 && <div style={{ flex:runPct,  background:RUN_COLOR  }}/>}
      {passPct > 0 && <div style={{ flex:passPct, background:PASS_COLOR }}/>}
      {rpoPct  > 0 && <div style={{ flex:rpoPct,  background:RPO_COLOR  }}/>}
    </div>
  );
}

// ── Top plays from raw play rows ──────────────────────────────────────────────
function topPlays(plays, n = 6) {
  const counts = {};
  plays.forEach(p => {
    const name = (p["OFF PLAY"] || "").trim();
    if (!name) return;
    const pt = (p["PLAY TYPE CALLED"] || p["PLAY TYPE"] || "").toLowerCase();
    const key = name;
    if (!counts[key]) counts[key] = { name, count: 0, pt };
    counts[key].count++;
  });
  return Object.values(counts)
    .sort((a,b) => b.count - a.count)
    .slice(0, n);
}

// ── Opponent Overview Quick ───────────────────────────────────────────────────
function OverviewQuick({ game, roster, formations }) {
  const depth = roster?.depth || {};
  return (
    <div id="print-area">
      {/* Page header */}
      <div style={{ borderBottom:`3px solid ${GREEN}`, paddingBottom:8, marginBottom:16 }}>
        <div style={{ fontSize:20, fontWeight:800, color:GREEN }}>
          Opponent Overview — {game.opponent}
        </div>
        <div style={{ fontSize:12, color:"#666", marginTop:2 }}>
          Week {game.week} · {game.season_name || ""}
        </div>
      </div>

      {/* Roster */}
      <SectionTitle>Roster</SectionTitle>
      <PrintRoster depth={depth} />

      {/* Formations */}
      {formations.length > 0 && (
        <div style={{ marginTop:20 }}>
          <SectionTitle>Top {formations.length} Formations</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8 }}>
            {formations.map(f => (
              <div key={f.form} style={{
                border:"1px solid #ddd", borderRadius:6, padding:"8px 10px", fontSize:10,
              }}>
                <div style={{ fontWeight:800, fontSize:11, color:GREEN,
                  marginBottom:3, borderBottom:"1px solid #eee", paddingBottom:3 }}>
                  {f.form}
                </div>
                <div style={{ color:"#666", fontSize:9, marginBottom:4 }}>{f.total} plays</div>
                <MiniBar runPct={f.runPct} passPct={f.passPct} rpoPct={f.rpoPct} />
                <div style={{ display:"flex", gap:4, marginTop:3, fontSize:9, flexWrap:"wrap" }}>
                  {f.runPct  > 0 && <span style={{ color:RUN_COLOR,  fontWeight:700 }}>R {f.runPct}%</span>}
                  {f.passPct > 0 && <span style={{ color:PASS_COLOR, fontWeight:700 }}>P {f.passPct}%</span>}
                  {f.rpoPct  > 0 && <span style={{ color:RPO_COLOR,  fontWeight:700 }}>RPO {f.rpoPct}%</span>}
                </div>
                {/* Top 3 plays */}
                <div style={{ marginTop:5, borderTop:"1px solid #f0f0f0", paddingTop:4 }}>
                  {topPlays(f.plays, 3).map((pl, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:3,
                      marginBottom:1, fontSize:8.5 }}>
                      <span style={{ color:"#aaa", minWidth:10 }}>{i+1}.</span>
                      <span style={{ flex:1, fontWeight:600, color:"#111", wordBreak:"break-word" }}>
                        {pl.name}
                      </span>
                      <span style={{ color:"#999", flexShrink:0 }}>×{pl.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Formation Detail (all on one page) ───────────────────────────────────────
function FormationDetail({ game, formations, images }) {
  return (
    <div id="print-area">
      {/* Header */}
      <div style={{ borderBottom:`3px solid ${GREEN}`, paddingBottom:6, marginBottom:14,
        display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
        <div style={{ fontSize:16, fontWeight:800, color:GREEN }}>
          Formation Detail — {game.opponent}
        </div>
        <div style={{ fontSize:11, color:"#666" }}>
          Week {game.week} · {game.season_name || ""}
        </div>
      </div>

      {/* All formations in a 3-column grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
        {formations.map(f => (
          <FormationCard key={f.form} f={f} images={images} />
        ))}
      </div>
    </div>
  );
}

function FormationCard({ f, images }) {
  const imgUrl = findImage(f.form, images);
  const plays  = topPlays(f.plays, 10);

  // Break plays into run/pass/rpo groups
  const runPlays  = topPlays(f.plays.filter(p => (p["PLAY TYPE CALLED"]||p["PLAY TYPE"]||"").toLowerCase() === "run"),  5);
  const passPlays = topPlays(f.plays.filter(p => (p["PLAY TYPE CALLED"]||p["PLAY TYPE"]||"").toLowerCase() === "pass"), 5);
  const rpoPlays  = topPlays(f.plays.filter(p => (p["PLAY TYPE CALLED"]||p["PLAY TYPE"]||"").toLowerCase() === "rpo"),  3);

  return (
    <div style={{
      border:"2px solid #ddd", borderRadius:8, overflow:"hidden", fontSize:11,
    }}>
      {/* Formation header */}
      <div style={{ background:GREEN, color:"#fff", padding:"5px 10px",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, fontWeight:800 }}>{f.form}</span>
        <span style={{ fontSize:9, opacity:.8 }}>{f.total} plays</span>
      </div>

      <div style={{ padding:"7px 9px" }}>
        {/* Image + summary row */}
        <div style={{ display:"flex", gap:8, marginBottom:7 }}>
          {imgUrl && (
            <div style={{ flex:"0 0 auto", maxWidth:100, border:"1px solid #eee",
              borderRadius:4, overflow:"hidden", background:"#fafafa" }}>
              <img src={imgUrl} alt={f.form}
                style={{ width:"100%", maxHeight:70, objectFit:"contain", display:"block" }} />
            </div>
          )}
          {/* Stats */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:5 }}>
            <MiniBar runPct={f.runPct} passPct={f.passPct} rpoPct={f.rpoPct} h={5} />
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {f.runPct  > 0 && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:RUN_COLOR, lineHeight:1 }}>{f.runPct}%</div>
                  <div style={{ fontSize:8, color:"#999" }}>Run ({f.run})</div>
                </div>
              )}
              {f.passPct > 0 && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:PASS_COLOR, lineHeight:1 }}>{f.passPct}%</div>
                  <div style={{ fontSize:8, color:"#999" }}>Pass ({f.pass})</div>
                </div>
              )}
              {f.rpoPct  > 0 && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:RPO_COLOR, lineHeight:1 }}>{f.rpoPct}%</div>
                  <div style={{ fontSize:8, color:"#999" }}>RPO ({f.rpo})</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top plays by type */}
        <div style={{ display:"grid", gridTemplateColumns: rpoPlays.length > 0 ? "1fr 1fr 1fr" : "1fr 1fr", gap:5 }}>
          {[
            { label:"Run", items: runPlays, color: RUN_COLOR },
            { label:"Pass", items: passPlays, color: PASS_COLOR },
            ...(rpoPlays.length > 0 ? [{ label:"RPO", items: rpoPlays, color: RPO_COLOR }] : []),
          ].map(({ label, items, color }) => (
            <div key={label}>
              <div style={{ fontSize:8, fontWeight:800, textTransform:"uppercase",
                letterSpacing:.5, color, marginBottom:3, borderBottom:`1px solid ${color}30`,
                paddingBottom:2 }}>{label}</div>
              {items.length === 0 ? (
                <div style={{ fontSize:8, color:"#bbb" }}>—</div>
              ) : items.map((pl, i) => (
                <div key={i} style={{ display:"flex", alignItems:"baseline", gap:3, marginBottom:1 }}>
                  <span style={{ background:`${color}18`, color, fontSize:7,
                    fontWeight:700, minWidth:14, textAlign:"center",
                    borderRadius:2, padding:"0 2px", flexShrink:0 }}>
                    {pl.count}×
                  </span>
                  <span style={{ fontSize:8, fontWeight:600, color:"#111", wordBreak:"break-word", lineHeight:1.2 }}>
                    {pl.name}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize:13, fontWeight:800, textTransform:"uppercase",
      letterSpacing:1, color:GREEN, marginBottom:8,
      borderBottom:`2px solid ${GREEN}`, paddingBottom:4,
    }}>{children}</div>
  );
}

function normKey(s) {
  return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,"_").replace(/_+/g,"_").replace(/^_|_$/g,"");
}
function findImage(formName, images) {
  if (!formName || !images) return null;
  const key = normKey(formName);
  if (images[key]) return images[key];
  const found = Object.entries(images).find(([k]) => k.includes(key) || key.includes(k));
  return found ? found[1] : null;
}

// ── Overview Report ───────────────────────────────────────────────────────────
function StatPill({ label, value, sub, color }) {
  return (
    <div style={{
      border: `1px solid #ddd`, borderRadius: 8, padding: "10px 16px",
      flex: 1, minWidth: 100, background: "#fafafa",
    }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: .7,
        color: "#999", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "#111",
        lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Group by OFF FORM only (no backfield) for the overview table
function groupByFormOnly(rows) {
  const map = {};
  rows.forEach(r => {
    const form = String(r["OFF FORM"] || "").trim();
    if (!form) return;
    if (!map[form]) map[form] = { form, total: 0, run: 0, pass: 0, rpo: 0 };
    const e = map[form];
    e.total++;
    const pt = String(r["PLAY TYPE CALLED"] || "").trim().toLowerCase();
    if (pt === "run")  e.run++;
    if (pt === "pass") e.pass++;
    if (pt === "rpo")  e.rpo++;
  });
  return Object.values(map)
    .sort((a, b) => b.total - a.total)
    .map(e => {
      const t = e.total;
      const rPct  = t ? Math.round(e.run  / t * 100) : 0;
      const pPct  = t ? Math.round(e.pass / t * 100) : 0;
      const oPct  = 100 - rPct - pPct;
      return { ...e, runPct: rPct, passPct: pPct, rpoPct: oPct };
    });
}

function FormOverviewTable({ formations }) {
  const total = formations.reduce((s, f) => s + f.total, 0);
  const hasRPO = formations.some(f => f.rpo > 0);

  function pctCell(val, color) {
    const colored = val > 70;
    return (
      <td style={{
        padding: "5px 10px", textAlign: "right", fontSize: 11,
        fontWeight: colored ? 800 : 400,
        color: colored ? color : "#111",
        borderBottom: "1px solid #eee",
      }}>{val}%</td>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ background: GREEN }}>
          {["Formation", "Total", "%", "Run", "Run%",
            ...(hasRPO ? ["RPO", "RPO%"] : []),
            "Pass", "Pass%"].map((h, i) => (
            <th key={i} style={{
              padding: "7px 10px", color: "#fff", fontSize: 10,
              fontWeight: 700, textAlign: i === 0 ? "left" : "right",
              textTransform: "uppercase", letterSpacing: .4, whiteSpace: "nowrap",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {formations.map((f, i) => {
          const sharePct = total ? Math.round(f.total / total * 100) : 0;
          return (
            <tr key={f.form} style={{ background: i % 2 === 0 ? "#fff" : "#f7f9f7" }}>
              <td style={{ padding: "6px 10px", fontWeight: 700, fontSize: 12,
                color: "#111", borderBottom: "1px solid #eee" }}>{f.form}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700,
                fontSize: 12, color: "#111", borderBottom: "1px solid #eee" }}>{f.total}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", fontSize: 10,
                color: "#999", borderBottom: "1px solid #eee" }}>{sharePct}%</td>
              <td style={{ padding: "5px 10px", textAlign: "right", fontSize: 11,
                color: "#111", borderBottom: "1px solid #eee" }}>{f.run}</td>
              {pctCell(f.runPct,  RUN_COLOR)}
              {hasRPO && <td style={{ padding: "5px 10px", textAlign: "right", fontSize: 11,
                color: "#111", borderBottom: "1px solid #eee" }}>{f.rpo}</td>}
              {hasRPO && pctCell(f.rpoPct, RPO_COLOR)}
              <td style={{ padding: "5px 10px", textAlign: "right", fontSize: 11,
                color: "#111", borderBottom: "1px solid #eee" }}>{f.pass}</td>
              {pctCell(f.passPct, PASS_COLOR)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function OverviewReport({ game, rows, formations }) {
  const stats    = useMemo(() => computePlaytypeStats(rows), [rows]);
  const formOnly = useMemo(() => groupByFormOnly(rows), [rows]);

  return (
    <div id="print-area" style={{ fontFamily: "system-ui, sans-serif", color: "#111" }}>
      {/* Page header */}
      <div style={{ borderBottom: `3px solid ${GREEN}`, paddingBottom: 8, marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>
          Overview — {game.opponent}
        </div>
        <div style={{ fontSize: 11, color: "#666" }}>
          Week {game.week}{game.date ? ` · ${game.date}` : ""}{game.season_name ? ` · ${game.season_name}` : ""}
        </div>
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <StatPill label="Offense Plays" value={stats.total} />
        <StatPill label="Run"  value={stats.run}  sub={`${stats.runPct}%`}  color={RUN_COLOR} />
        <StatPill label="Pass" value={stats.pass} sub={`${stats.passPct}%`} color={PASS_COLOR} />
        {stats.rpo > 0 && (
          <StatPill label="RPO" value={stats.rpo} sub={`${stats.rpoPct}%`} color={RPO_COLOR} />
        )}
        <StatPill label="Total Plays" value={rows.length} />
      </div>

      {/* D&D + Chart side by side */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 260px", border: "1px solid #ddd", borderRadius: 8,
          padding: "12px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: .8, color: "#999", marginBottom: 10 }}>Down &amp; Distance</div>
          <DDTable rows={stats.tableRows} />
        </div>
        <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8,
          padding: "12px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: .8, color: "#999", marginBottom: 10 }}>Run / Pass Distribution</div>
          <RunPassBar rows={stats.chartRows} />
        </div>
      </div>

      {/* Formation Overview */}
      <div style={{ borderTop: `2px solid ${GREEN}`, paddingTop: 10, marginBottom: 8,
        fontSize: 11, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: .8, color: GREEN }}>
        Formation Overview · {formOnly.length} formations · {stats.total} plays
      </div>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <FormOverviewTable formations={formOnly} />
      </div>
    </div>
  );
}

// ── Custom (configurable) Report ─────────────────────────────────────────────
const CUSTOM_SECTIONS = [
  { key: "stats",      label: "Stats Summary"           },
  { key: "dd",         label: "Down & Distance"         },
  { key: "chart",      label: "Run / Pass Chart"        },
  { key: "formTable",  label: "Formation Table"         },
  { key: "formCards",  label: "Formation Detail Cards"  },
  { key: "roster",     label: "Roster"                  },
];

function ReportSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        borderTop: `2px solid ${GREEN}`, paddingTop: 8, marginBottom: 10,
        fontSize: 10, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: 1, color: GREEN,
      }}>{title}</div>
      {children}
    </div>
  );
}

function CustomReport({ game, rows, formations, roster, images, sections }) {
  const stats    = useMemo(() => computePlaytypeStats(rows), [rows]);
  const formOnly = useMemo(() => groupByFormOnly(rows), [rows]);
  const depth    = roster?.depth || {};

  // Render sections in the user-defined order, skipping disabled ones
  const activeSections = sections.filter(s => s.on);
  const has = key => activeSections.some(s => s.key === key);

  return (
    <div id="print-area" style={{ fontFamily: "system-ui, sans-serif", color: "#111" }}>
      {/* Page header — always shown */}
      <div style={{
        borderBottom: `3px solid ${GREEN}`, paddingBottom: 8, marginBottom: 18,
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>
          {game.opponent}
        </div>
        <div style={{ fontSize: 11, color: "#666" }}>
          Week {game.week}{game.date ? ` · ${game.date}` : ""}{game.season_name ? ` · ${game.season_name}` : ""}
        </div>
      </div>

      {/* Render sections in user-defined order */}
      {activeSections.map(sec => {
        if (sec.key === "stats") return (
          <ReportSection key="stats" title="Stats Summary">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <StatPill label="Offense Plays" value={stats.total} />
              <StatPill label="Run"  value={stats.run}  sub={`${stats.runPct}%`}  color={RUN_COLOR} />
              <StatPill label="Pass" value={stats.pass} sub={`${stats.passPct}%`} color={PASS_COLOR} />
              {stats.rpo > 0 && <StatPill label="RPO" value={stats.rpo} sub={`${stats.rpoPct}%`} color={RPO_COLOR} />}
              <StatPill label="Total Plays" value={rows.length} />
            </div>
          </ReportSection>
        );
        if (sec.key === "dd") return (
          <ReportSection key="dd" title="Down & Distance">
            <div style={{ maxWidth: 360, border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px" }}>
              <DDTable rows={stats.tableRows} />
            </div>
          </ReportSection>
        );
        if (sec.key === "chart") return (
          <ReportSection key="chart" title="Run / Pass Distribution">
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "12px 14px" }}>
              <RunPassBar rows={stats.chartRows} />
            </div>
          </ReportSection>
        );
        if (sec.key === "formTable") return (
          <ReportSection key="formTable" title={`Formation Overview · ${formOnly.length} formations`}>
            <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
              <FormOverviewTable formations={formOnly} />
            </div>
          </ReportSection>
        );
        if (sec.key === "formCards") return (
          <ReportSection key="formCards" title="Formation Detail">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {formations.map(f => <FormationCard key={f.form} f={f} images={images} />)}
            </div>
          </ReportSection>
        );
        if (sec.key === "roster") return (
          <ReportSection key="roster" title="Roster">
            <PrintRoster depth={depth} />
          </ReportSection>
        );
        return null;
      })}
    </div>
  );
}

// ── Print styles ──────────────────────────────────────────────────────────────
const PRINT_STYLES = `
  @media print {
    body * { visibility: hidden; }
    #print-area, #print-area * { visibility: visible; }
    #print-area { position: absolute; top: 0; left: 0; width: 100%; padding: 16px; box-sizing: border-box; }
    .no-print { display: none !important; }
    @page { margin: 12mm; }
  }
`;

// ── Main Print page ───────────────────────────────────────────────────────────
export default function Print() {
  const { selectedGame, selectedSeason, playRows } = useApp();
  const [roster,  setRoster]  = useState(null);
  const [images,  setImages]  = useState({});
  const [report,   setReport]   = useState("custom");
  const [sections, setSections] = useState(
    CUSTOM_SECTIONS.map(s => ({ ...s, on: true }))
  );
  const dragIdx = useRef(null);

  useEffect(() => {
    if (!selectedGame) { setRoster(null); return; }
    apiGetRoster(selectedGame.id).then(setRoster).catch(() => setRoster(null));
  }, [selectedGame?.id]);

  useEffect(() => {
    const teamId = selectedSeason?.team_id;
    if (!teamId) { setImages({}); return; }
    apiGetImages(teamId).then(setImages).catch(() => setImages({}));
  }, [selectedSeason?.team_id]);

  const formations = useMemo(
    () => computeFormationStats(playRows),
    [playRows]
  );

  const top10 = useMemo(() => formations.slice(0, 10), [formations]);

  if (!selectedGame) {
    return (
      <div style={{ padding:24, color:"var(--text3)" }}>Kein Spiel ausgewählt.</div>
    );
  }

  return (
    <div style={{ padding:"20px 28px", maxWidth:1000 }}>
      <style>{PRINT_STYLES}</style>

      {/* Controls */}
      <div className="no-print" style={{
        marginBottom: 20, background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
      }}>
        {/* Top bar: report type + print button */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
        }}>
          <label style={{ fontSize:12, fontWeight:700, color:"var(--text2)" }}>Report:</label>
          <select
            value={report}
            onChange={e => setReport(e.target.value)}
            style={{
              background:"var(--surface2)", color:"var(--text)",
              border:"1px solid var(--border)", borderRadius:6,
              padding:"6px 12px", fontSize:13, fontWeight:600, cursor:"pointer",
            }}
          >
            <option value="custom">Custom Report</option>
            <option value="overview">Overview Report</option>
            <option value="quick">Opponent Overview Quick</option>
            <option value="detail">Formation Detail</option>
          </select>
          <span style={{ flex: 1 }} />
          <button onClick={() => window.print()} style={{
            background: GREEN, color: "#fff", border: "none", borderRadius: 7,
            padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>🖨 Print / Save as PDF</button>
        </div>

        {/* Section toggles — only for custom report */}
        {report === "custom" && (
          <div style={{ padding: "10px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: .6, color: "var(--text3)", marginBottom: 8 }}>
              Sections — drag to reorder
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sections.map((sec, i) => (
                <div
                  key={sec.key}
                  draggable
                  onDragStart={() => { dragIdx.current = i; }}
                  onDragOver={e => {
                    e.preventDefault();
                    if (dragIdx.current === null || dragIdx.current === i) return;
                    setSections(prev => {
                      const next = [...prev];
                      const [item] = next.splice(dragIdx.current, 1);
                      next.splice(i, 0, item);
                      dragIdx.current = i;
                      return next;
                    });
                  }}
                  onDragEnd={() => { dragIdx.current = null; }}
                  style={{
                    display: "flex", alignItems: "center", gap: 0,
                    borderRadius: 20, overflow: "hidden",
                    border: `1px solid ${sec.on ? GREEN : "var(--border)"}`,
                    background: sec.on ? GREEN : "var(--surface2)",
                    userSelect: "none",
                    cursor: "grab",
                    transition: "opacity .15s",
                  }}
                >
                  {/* Drag handle */}
                  <span style={{
                    padding: "6px 8px 6px 12px",
                    fontSize: 12, opacity: .6,
                    color: sec.on ? "#fff" : "var(--text3)",
                  }}>⠿</span>
                  {/* Toggle button */}
                  <button
                    onClick={() => setSections(prev =>
                      prev.map(s => s.key === sec.key ? { ...s, on: !s.on } : s)
                    )}
                    style={{
                      padding: "6px 14px 6px 4px", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", border: "none", background: "transparent",
                      color: sec.on ? "#fff" : "var(--text3)",
                    }}
                  >
                    {sec.on ? "✓" : "○"} {sec.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report content */}
      {report === "custom" && (
        <CustomReport
          game={selectedGame}
          rows={playRows}
          formations={formations}
          roster={roster}
          images={images}
          sections={sections}
        />
      )}
      {report === "overview" && (
        <OverviewReport
          game={selectedGame}
          rows={playRows}
          formations={formations}
        />
      )}
      {report === "quick" && (
        <OverviewQuick
          game={selectedGame}
          roster={roster}
          formations={top10}
        />
      )}
      {report === "detail" && (
        <FormationDetail
          game={selectedGame}
          formations={formations}
          images={images}
        />
      )}
    </div>
  );
}
