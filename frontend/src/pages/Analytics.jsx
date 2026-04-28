import { useState, useMemo } from "react";
import { useFetch } from "../hooks/useFetch";

// ── Unicorns brand colors (exact from desktop app source) ────────────────────
const TH = {
  bg:          "#111111",
  bg2:         "#1C1C1C",
  bg3:         "#272727",
  accent:      "#154734",   // Unicorns dark green
  accent2:     "#1D6048",
  text:        "#FFFFFF",
  text2:       "#888888",
  run_color:   "#7B6EA0",   // muted purple
  pass_color:  "#4472C4",   // steel blue
  tree_hdr_bg: "#154734",
  tree_hdr_fg: "#FFFFFF",
  tree_row:    "#1C1C1C",
  tree_alt:    "#252525",
  tree_grp_bg: "#212121",
  tree_grp_fg: "#5CBF8A",
  chart_grid:  "#333333",
};

// Pie colors (exact from desktop app)
const PIE_COLORS = ["#4472C4","#7B6EA0","#5B9BD5","#8472A8",
                    "#2E75B6","#9B8FB0","#4A6FA5","#6D5F94"];

// ── Down group prefix for group headers ──────────────────────────────────────
function downPrefix(group) {
  const m = group.match(/^(1st|2nd|3rd|4th)/i);
  return m ? m[1] : group;
}

// ── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = ["Playtype", "Formation", "Personnel"];

function UTabBar({ active, onChange }) {
  return (
    <div className="u-tabbar">
      {TABS.map((t, i) => (
        <button
          key={t}
          className={`u-tab${active === i ? " u-tab--active" : ""}`}
          onClick={() => onChange(i)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Stat badge ───────────────────────────────────────────────────────────────
function StatBadge({ label, value, valueColor }) {
  return (
    <div className="u-stat-badge">
      <span className="u-stat-badge__label">{label}</span>
      <span className="u-stat-badge__value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </span>
    </div>
  );
}

// ── Down & Distance Table ────────────────────────────────────────────────────
function DDTable({ rows, showGroupHeaders = true }) {
  if (!rows || rows.length === 0)
    return <div className="u-empty">Keine Daten</div>;

  let lastPrefix = null;
  const rendered = [];
  rows.forEach((r, i) => {
    const prefix = downPrefix(r.down_group);
    if (showGroupHeaders && prefix !== lastPrefix) {
      lastPrefix = prefix;
      rendered.push(
        <tr key={`grp-${prefix}`} className="u-tbl-grp">
          <td colSpan={6} className="u-tbl-grp__cell">{prefix} Down</td>
        </tr>
      );
    }
    const runHot  = r.run_pct  >= 70;
    const passHot = r.pass_pct >= 70 && !runHot;
    rendered.push(
      <tr key={i} className={i % 2 === 0 ? "u-tbl-row" : "u-tbl-row u-tbl-row--alt"}>
        <td className="u-tbl-cell u-tbl-cell--left">{r.down_group}</td>
        <td className="u-tbl-cell">{r.total}</td>
        <td className="u-tbl-cell">{r.run}</td>
        <td className="u-tbl-cell">
          <span className={runHot ? "u-pct u-pct--run" : "u-pct"}>{r.run_pct}%</span>
        </td>
        <td className="u-tbl-cell">{r.pass_}</td>
        <td className="u-tbl-cell">
          <span className={passHot ? "u-pct u-pct--pass" : "u-pct"}>{r.pass_pct}%</span>
        </td>
      </tr>
    );
  });

  return (
    <div className="u-tbl-wrap">
      <table className="u-tbl">
        <thead>
          <tr className="u-tbl-hdr">
            <th className="u-tbl-th u-tbl-th--left">Down Group</th>
            <th className="u-tbl-th">Total</th>
            <th className="u-tbl-th">Run</th>
            <th className="u-tbl-th">Run %</th>
            <th className="u-tbl-th">Pass</th>
            <th className="u-tbl-th">Pass %</th>
          </tr>
        </thead>
        <tbody>{rendered}</tbody>
      </table>
    </div>
  );
}

// ── DD table (formation/personnel variant — 4 cols) ──────────────────────────
function DDTable4({ rows }) {
  if (!rows || rows.length === 0)
    return <div className="u-empty">Keine Daten</div>;

  let lastPrefix = null;
  const rendered = [];
  rows.forEach((r, i) => {
    const prefix = downPrefix(r.down_group);
    if (prefix !== lastPrefix) {
      lastPrefix = prefix;
      rendered.push(
        <tr key={`grp-${prefix}`} className="u-tbl-grp">
          <td colSpan={4} className="u-tbl-grp__cell">{prefix} Down</td>
        </tr>
      );
    }
    const runHot  = r.run_pct  >= 70;
    const passHot = r.pass_pct >= 70 && !runHot;
    rendered.push(
      <tr key={i} className={i % 2 === 0 ? "u-tbl-row" : "u-tbl-row u-tbl-row--alt"}>
        <td className="u-tbl-cell u-tbl-cell--left">{r.down_group}</td>
        <td className="u-tbl-cell">{r.total}</td>
        <td className="u-tbl-cell">
          <span className={runHot ? "u-pct u-pct--run" : "u-pct"}>{r.run_pct}%</span>
        </td>
        <td className="u-tbl-cell">
          <span className={passHot ? "u-pct u-pct--pass" : "u-pct"}>{r.pass_pct}%</span>
        </td>
      </tr>
    );
  });

  return (
    <div className="u-tbl-wrap">
      <table className="u-tbl">
        <thead>
          <tr className="u-tbl-hdr">
            <th className="u-tbl-th u-tbl-th--left">Down Group</th>
            <th className="u-tbl-th">Total</th>
            <th className="u-tbl-th">Run %</th>
            <th className="u-tbl-th">Pass %</th>
          </tr>
        </thead>
        <tbody>{rendered}</tbody>
      </table>
    </div>
  );
}

// ── Bar chart (Run% vs Pass% grouped) ───────────────────────────────────────
function RunPassBarChart({ rows, title }) {
  if (!rows || rows.length === 0) return null;
  const barW   = Math.max(6, Math.min(18, Math.floor(520 / rows.length / 2.8)));
  const gap    = 3;
  const chartH = 200;
  const padL   = 36; const padR = 8; const padT = 32; const padB = 56;
  const totalW = padL + rows.length * (barW * 2 + gap + 12) + padR;

  return (
    <div className="u-chart-wrap">
      {title && <div className="u-chart-title">{title}</div>}
      <div style={{ overflowX: "auto" }}>
        <svg width={totalW} height={chartH + padT + padB} style={{ display: "block" }}>
          {/* Y-axis grid */}
          {[0, 25, 50, 75, 100].map(pct => {
            const y = padT + chartH - (pct / 100) * chartH;
            return (
              <g key={pct}>
                <line x1={padL} y1={y} x2={totalW - padR} y2={y}
                      stroke={TH.chart_grid} strokeWidth={1} />
                <text x={padL - 4} y={y + 4} textAnchor="end"
                      fill={TH.text2} fontSize={9}>{pct}</text>
              </g>
            );
          })}
          {/* Bars */}
          {rows.map((r, i) => {
            const cx   = padL + i * (barW * 2 + gap + 12) + barW + gap / 2 + 6;
            const runH  = (r.run_pct  / 100) * chartH;
            const pasH  = (r.pass_pct / 100) * chartH;
            const runY  = padT + chartH - runH;
            const pasY  = padT + chartH - pasH;
            const label = r.down_group.replace(" (+)", "+").replace("1st short", "1st sh");
            return (
              <g key={i}>
                {/* Run bar */}
                <rect x={cx - barW - 1} y={runY} width={barW} height={runH}
                      fill={TH.run_color} rx={2} />
                {r.run_pct >= 9 && barW >= 10 && (
                  <text x={cx - barW/2 - 1} y={runY - 3} textAnchor="middle"
                        fill={TH.text} fontSize={8}>{r.run_pct}%</text>
                )}
                {/* Pass bar */}
                <rect x={cx + 1} y={pasY} width={barW} height={pasH}
                      fill={TH.pass_color} rx={2} />
                {r.pass_pct >= 9 && barW >= 10 && (
                  <text x={cx + barW/2 + 1} y={pasY - 3} textAnchor="middle"
                        fill={TH.text} fontSize={8}>{r.pass_pct}%</text>
                )}
                {/* X label */}
                <text x={cx} y={padT + chartH + 10} textAnchor="end"
                      fill={TH.text} fontSize={8}
                      transform={`rotate(35, ${cx}, ${padT + chartH + 10})`}>
                  {label}
                </text>
              </g>
            );
          })}
          {/* Legend */}
          <rect x={totalW - 140} y={8} width={10} height={10} fill={TH.run_color} />
          <text x={totalW - 127} y={17} fill={TH.text} fontSize={9}>Run %</text>
          <rect x={totalW - 80} y={8} width={10} height={10} fill={TH.pass_color} />
          <text x={totalW - 67} y={17} fill={TH.text} fontSize={9}>Pass %</text>
        </svg>
      </div>
    </div>
  );
}

// ── Top-3 Card ───────────────────────────────────────────────────────────────
const MEDALS = ["#FFD700", "#C0C0C0", "#CD7F32"];

function Top3Card({ title, plays }) {
  return (
    <div className="u-top3-card">
      <div className="u-top3-card__title">{title}</div>
      <div className="u-top3-card__body">
        {(!plays || plays.length === 0) ? (
          <div className="u-empty">No data tagged yet</div>
        ) : plays.map((p, i) => (
          <div key={i} className="u-top3-row">
            <span className="u-top3-rank" style={{ color: MEDALS[i] || TH.text2 }}>
              #{i + 1}
            </span>
            <span className="u-top3-play">{p.play || "—"}</span>
            <span className="u-top3-stat">{p.count}×&nbsp;&nbsp;{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pie chart (SVG, matches desktop app style) ────────────────────────────────
function PieChart({ data, title }) {
  if (!data || data.length === 0) return null;
  const W = 280; const H = 220;
  const R = 80;
  const cx = W / 2; const cy = 110;
  const total = data.reduce((s, d) => s + d.count, 0);

  let startAngle = Math.PI / 2;
  const slices = data.slice(0, 8).map((d, i) => {
    const sweep = (d.count / total) * Math.PI * 2;
    const endAngle = startAngle - sweep;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy - R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy - R * Math.sin(endAngle);
    const large = sweep > Math.PI ? 1 : 0;
    const mid = startAngle - sweep / 2;
    const lx = cx + R * 0.62 * Math.cos(mid);
    const ly = cy - R * 0.62 * Math.sin(mid);
    const pct = Math.round(d.count / total * 100);
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 0 ${x2} ${y2} Z`;
    const result = { path, lx, ly, pct, color: PIE_COLORS[i % PIE_COLORS.length],
      name: d.name || d.off_form || "—", count: d.count };
    startAngle = endAngle;
    return result;
  });

  // Legend rows
  const legendItems = data.slice(0, 8);

  return (
    <div className="u-pie-wrap">
      {title && <div className="u-chart-title">{title}</div>}
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.path} fill={s.color} stroke={TH.bg} strokeWidth={2} />
            {s.pct >= 6 && (
              <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize={10} fontWeight="bold">{s.pct}%</text>
            )}
          </g>
        ))}
      </svg>
      <div className="u-pie-legend">
        {legendItems.map((d, i) => (
          <div key={i} className="u-pie-leg-row">
            <span className="u-pie-leg-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="u-pie-leg-name">{d.name || d.off_form}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 1 — PLAYTYPE
// ════════════════════════════════════════════════════════════════════════════
const DOWN_FILTERS = ["All", "1st", "2nd", "3rd", "4th"];

function PlaytypeTab({ game }) {
  const [filter, setFilter] = useState("All");

  const rows = useMemo(() => {
    if (!game) return [];
    if (filter === "All") return game.down_distance;
    return game.down_distance.filter(r => r.down_group.startsWith(filter));
  }, [game, filter]);

  return (
    <div className="u-tab-content">
      <div className="u-tab-header">
        <h2 className="u-section-title">Down &amp; Distance Tendency</h2>
        <p className="u-section-sub">Run % vs Pass % by Down &amp; Distance Group</p>
      </div>

      {/* Down filter */}
      <div className="u-filter-bar">
        <span className="u-filter-label">Filter by Down:</span>
        <div className="u-seg-btns">
          {DOWN_FILTERS.map(f => (
            <button key={f}
              className={`u-seg-btn${filter === f ? " u-seg-btn--active" : ""}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Body: table left + chart right */}
      <div className="u-body-split">
        <div className="u-body-split__left">
          <DDTable rows={rows} showGroupHeaders={filter === "All"} />
        </div>
        <div className="u-body-split__right">
          <RunPassBarChart rows={rows}
            title={`Run% vs Pass% — ${filter === "All" ? "All Plays" : filter + " Down"}`} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 2 — FORMATION
// ════════════════════════════════════════════════════════════════════════════
function FormationTab({ game }) {
  const [selForm, setSelForm] = useState("All");
  const [selBF,   setSelBF]   = useState("All");

  const allForms = useMemo(() => {
    if (!game) return [];
    return [{ name: "All", count: game.total_plays }, ...game.formations];
  }, [game]);

  const bfOptions = useMemo(() => {
    if (!game || selForm === "All") return ["All", ...game.backfields];
    const f = game.formations.find(f => f.name === selForm);
    return ["All", ...(f?.backfields || [])];
  }, [game, selForm]);

  const analysis = useMemo(() => {
    if (!game) return null;
    let sub = selForm === "All" ? game.formations.flatMap(() => []) : null;

    if (selForm === "All") {
      // Aggregate across all
      const totalP = game.total_plays;
      const all = game.formations;
      const run_n  = all.reduce((s, f) => s + f.run_n, 0);
      const pass_n = all.reduce((s, f) => s + f.pass_n, 0);
      return {
        title: "All Formations",
        total: totalP, run_n, pass_n,
        run_pct: Math.round(run_n / totalP * 100), pass_pct: Math.round(pass_n / totalP * 100),
        top3_run: [], top3_pass_play: [], top3_f_routes: [], top3_b_routes: [],
        dd: game.down_distance,
      };
    }
    const f = game.formations.find(f => f.name === selForm);
    if (!f) return null;
    return {
      title: selForm + (selBF !== "All" ? ` — ${selBF}` : ""),
      total: f.count, run_n: f.run_n, pass_n: f.pass_n,
      run_pct: f.run_pct, pass_pct: f.pass_pct,
      top3_run: f.top3_run, top3_pass_play: f.top3_pass_play,
      top3_f_routes: f.top3_f_routes, top3_b_routes: f.top3_b_routes,
      dd: f.dd,
    };
  }, [game, selForm, selBF]);

  if (!game) return null;

  const FORM_IMG = {
    "TRIO":    "/formations/trio gf.jpg",
    "DOUBLES": "/formations/doubles gf.jpg",
    "OPEN":    "/formations/open sg.jpg",
  };

  return (
    <div className="u-tab-content">
      {/* Filter bar */}
      <div className="u-filter-bar">
        <span className="u-filter-label">Formation:</span>
        <select className="u-select" value={selForm}
          onChange={e => { setSelForm(e.target.value); setSelBF("All"); }}>
          {allForms.map(f => (
            <option key={f.name} value={f.name}>{f.name} ({f.count})</option>
          ))}
        </select>
        <span className="u-filter-label" style={{ marginLeft: 20 }}>Backfield:</span>
        <select className="u-select" value={selBF} onChange={e => setSelBF(e.target.value)}>
          {bfOptions.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Summary strip */}
      {analysis && (
        <div className="u-summary-strip">
          <span className="u-summary-title">{analysis.title}</span>
          <StatBadge label="Total Plays" value={String(analysis.total)} />
          <StatBadge label="Run" value={`${analysis.run_n}  (${analysis.run_pct}%)`}
                     valueColor={TH.run_color} />
          <StatBadge label="Pass" value={`${analysis.pass_n}  (${analysis.pass_pct}%)`}
                     valueColor={TH.pass_color} />
        </div>
      )}

      {/* Formation image (if known) */}
      {selForm !== "All" && FORM_IMG[selForm] && (
        <div className="u-form-img-wrap">
          <img src={FORM_IMG[selForm]} alt={selForm} className="u-form-img" />
        </div>
      )}

      {/* Top-3 cards 2×2 */}
      <div className="u-top3-grid">
        <Top3Card title="🏃  Top 3 Run Plays  (OFF PLAY)"
                  plays={analysis?.top3_run} />
        <Top3Card title="🎯  Top 3 Pass — Scheme  (ROUTE CONCEPT)"
                  plays={analysis?.top3_pass_play} />
        <Top3Card title="📐  Top 3 Field Routes  (F ROUTES)"
                  plays={analysis?.top3_f_routes} />
        <Top3Card title="📐  Top 3 Boundary Routes  (B ROUTES)"
                  plays={analysis?.top3_b_routes} />
      </div>

      {/* D&D for selected formation */}
      <div className="u-form-dd-label">Down &amp; Distance for Selected Formation</div>
      <div className="u-body-split">
        <div className="u-body-split__left">
          <DDTable4 rows={analysis?.dd || []} />
        </div>
        <div className="u-body-split__right">
          <RunPassBarChart rows={analysis?.dd || []}
            title={`${selForm}${selBF !== "All" ? " + BF " + selBF : ""} — D&D`} />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 3 — PERSONNEL
// ════════════════════════════════════════════════════════════════════════════
const PERS_LABELS = {
  "10": "10 (1 RB · 0 TE · 4 WR)",
  "11": "11 (1 RB · 1 TE · 3 WR)",
  "12": "12 (1 RB · 2 TE · 2 WR)",
  "20": "20 (2 RB · 0 TE · 3 WR)",
  "21": "21 (2 RB · 1 TE · 2 WR)",
  "0":  "00 (0 RB · 0 TE · 5 WR)",
  "13E":"13E (1 RB · 3 TE · 1 WR)",
};

function PersonnelTab({ game }) {
  const [sel, setSel] = useState("All");

  const persOptions = useMemo(() => {
    if (!game) return [];
    return [{ name: "All", count: game.total_plays }, ...game.personnel];
  }, [game]);

  const data = useMemo(() => {
    if (!game) return null;
    if (sel === "All") {
      return { total: game.total_plays, dd: game.down_distance,
               formations: game.personnel.flatMap(() => []) };
    }
    return game.personnel.find(p => p.name === sel) || null;
  }, [game, sel]);

  if (!game) return null;

  // Formation usage table
  const formRows = data?.formations || [];

  return (
    <div className="u-tab-content">
      {/* Filter bar */}
      <div className="u-filter-bar">
        <span className="u-filter-label">Personnel:</span>
        <select className="u-select" value={sel} onChange={e => setSel(e.target.value)}>
          {persOptions.map(p => (
            <option key={p.name} value={p.name}>
              {PERS_LABELS[p.name] || p.name} ({p.count})
            </option>
          ))}
        </select>
        {data && (
          <span className="u-pers-count">{data.total} plays</span>
        )}
      </div>

      {/* Three columns */}
      <div className="u-pers-body">
        {/* D&D */}
        <div className="u-pers-col">
          <div className="u-pers-col__title">Down &amp; Distance</div>
          <DDTable4 rows={data?.dd || []} />
        </div>

        {/* Formation usage */}
        <div className="u-pers-col">
          <div className="u-pers-col__title">Formation Usage</div>
          <div className="u-tbl-wrap">
            <table className="u-tbl">
              <thead>
                <tr className="u-tbl-hdr">
                  <th className="u-tbl-th u-tbl-th--left">Formation</th>
                  <th className="u-tbl-th">%</th>
                  <th className="u-tbl-th">Count</th>
                  <th className="u-tbl-th">Run %</th>
                  <th className="u-tbl-th">Pass %</th>
                </tr>
              </thead>
              <tbody>
                {formRows.map((f, i) => {
                  const runHot  = f.run_pct  >= 70;
                  const passHot = f.pass_pct >= 70 && !runHot;
                  return (
                    <tr key={i} className={i % 2 === 0 ? "u-tbl-row" : "u-tbl-row u-tbl-row--alt"}>
                      <td className="u-tbl-cell u-tbl-cell--left">{f.name}</td>
                      <td className="u-tbl-cell">{f.pct}%</td>
                      <td className="u-tbl-cell">{f.count}</td>
                      <td className="u-tbl-cell">
                        <span className={runHot ? "u-pct u-pct--run" : "u-pct"}>{f.run_pct}%</span>
                      </td>
                      <td className="u-tbl-cell">
                        <span className={passHot ? "u-pct u-pct--pass" : "u-pct"}>{f.pass_pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie */}
        <div className="u-pers-col">
          <PieChart
            data={formRows.map(f => ({ ...f, off_form: f.name }))}
            title={`Personnel ${sel} — Formation Split`}
          />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const { data: allGames, loading, error } = useFetch("/api/playdata");
  const [gameIdx, setGameIdx] = useState(0);
  const [tab, setTab]         = useState(0);

  const game = useMemo(() => allGames?.[gameIdx] ?? null, [allGames, gameIdx]);

  return (
    <div className="u-page">
      {/* ── Top bar ── */}
      <div className="u-topbar">
        <div className="u-topbar__brand">
          <span className="u-topbar__unicorns">UNICORNS</span>
          <span className="u-topbar__analytics">Analytics</span>
        </div>

        {/* Game selector */}
        <div className="u-topbar__controls">
          {allGames && (
            <>
              <span className="u-filter-label">Spiel:</span>
              <select className="u-select"
                value={gameIdx}
                onChange={e => { setGameIdx(Number(e.target.value)); setTab(0); }}>
                {allGames.map((g, i) => (
                  <option key={i} value={i}>{g.game}</option>
                ))}
              </select>
            </>
          )}
          {game && (
            <span className="u-topbar__plays">
              📄&nbsp;&nbsp;{game.game}&nbsp;&nbsp;·&nbsp;&nbsp;{game.total_plays} plays
            </span>
          )}
        </div>
      </div>

      {/* ── Loading / error ── */}
      {loading && <div className="u-loading">Lade Daten…</div>}
      {error   && <div className="u-error">Fehler beim Laden der Daten.</div>}

      {/* ── Tabs ── */}
      {game && (
        <>
          <UTabBar active={tab} onChange={setTab} />
          {tab === 0 && <PlaytypeTab  game={game} />}
          {tab === 1 && <FormationTab game={game} />}
          {tab === 2 && <PersonnelTab game={game} />}
        </>
      )}
    </div>
  );
}
