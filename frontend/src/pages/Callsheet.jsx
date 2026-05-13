import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { computeCallsheetData, computeCallsheetDataPrep } from "../lib/dataEngine";

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "var(--rpo-color)";
const GREEN      = "var(--accent)";

// ── Multi-select chip filter ──────────────────────────────────────────────────
function ChipFilter({ label, options, selected, onToggle, onClearAll }) {
  if (!options || options.length === 0) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: .5, marginRight: 8 }}>
          {label}
        </span>
      )}
      {onClearAll && selected.length > 0 && (
        <button onClick={onClearAll} style={{
          fontSize: 11, color: "var(--text3)", background: "var(--surface2)",
          border: "1px solid var(--border)", borderRadius: 20, cursor: "pointer",
          marginRight: 4, padding: "2px 8px", lineHeight: 1,
        }}>✕</button>
      )}
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 5 }}>
        {options.map(opt => {
          const active = selected.includes(opt);
          return (
            <button key={opt} onClick={() => onToggle(opt)} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20,
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              background: active ? "var(--accent)" : "var(--surface2)",
              color: active ? "#fff" : "var(--text2)",
              cursor: "pointer", fontWeight: active ? 700 : 400,
              transition: "all .15s",
            }}>
              {opt}
            </button>
          );
        })}
      </span>
    </div>
  );
}

// ── Run/Pass/RPO bar ──────────────────────────────────────────────────────────
function RPOBar({ run, pass, rpo = 0, n, height = 28, fontSize = 11 }) {
  if (!n) return (
    <div style={{ color: "var(--text3)", fontSize: 12, padding: "10px 0", textAlign: "center" }}>
      — no data —
    </div>
  );
  const segments = [
    { pct: pass, color: PASS_COLOR, label: "PASS" },
    { pct: run,  color: RUN_COLOR,  label: "RUN"  },
    ...(rpo > 0 ? [{ pct: rpo, color: RPO_COLOR, label: "RPO" }] : []),
  ].filter(s => s.pct > 0);

  return (
    <div style={{ display: "flex", width: "100%", height, borderRadius: 3, overflow: "hidden" }}>
      {segments.map(({ pct: p, color, label }, i) => (
        <div key={label} style={{
          flex: Math.max(p, 4), background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize, fontWeight: 700,
          borderLeft: i > 0 ? "1px solid rgba(255,255,255,.2)" : "none",
          overflow: "hidden", minWidth: 0,
        }}>
          {p > 8 ? `${label} ${p}%` : p > 4 ? `${p}%` : ""}
        </div>
      ))}
    </div>
  );
}

// ── Tendency card (used in both prep & live) ──────────────────────────────────
function TendCard({ title, subtitle, run, pass, rpo = 0, n, children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden", flex: 1, minWidth: 180,
    }}>
      <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)",
        padding: "8px 12px" }}>
        <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{title}</div>
        {subtitle && (
          <div style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: .4, marginTop: 2 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px" }}>
        <RPOBar run={run} pass={pass} rpo={rpo} n={n} />
        {n > 0 && (
          <div style={{ color: "var(--text3)", fontSize: 10, textAlign: "right", marginTop: 3 }}>
            n={n}
          </div>
        )}
        {/* Mini personnel breakdown */}
        {children}
      </div>
    </div>
  );
}

// ── Personnel breakdown (inside a TendCard) ───────────────────────────────────
// pers items come from topPersonnel() → raw counts { pers, n, run, pass, rpo }
function PersonnelBreakdown({ pers }) {
  if (!pers || pers.length === 0) return null;
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
      {pers.map((p, j) => {
        const total  = p.run + p.pass + p.rpo;
        const rPct   = total ? Math.round(p.run  / total * 100) : 0;
        const psPct  = total ? Math.round(p.pass / total * 100) : 0;
        const rpoPct = 100 - rPct - psPct;
        return (
          <div key={j} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              marginBottom: 2, fontSize: 11 }}>
              <span style={{ color: "var(--text2)", fontWeight: 600 }}>{p.pers}</span>
              <span style={{ color: "var(--text3)" }}>n={p.n}</span>
            </div>
            <RPOBar run={rPct} pass={psPct} rpo={rpoPct} n={p.n} height={16} fontSize={9} />
          </div>
        );
      })}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{ margin: "28px 0 12px" }}>
      <div style={{ height: 3, background: "var(--accent)", borderRadius: 2, marginBottom: 8 }} />
      <div style={{ background: "var(--accent)", color: "#fff", padding: "7px 16px",
        borderRadius: 4, fontSize: 13, fontWeight: 700, display: "inline-block" }}>
        {title}
      </div>
    </div>
  );
}

// ── 2nd Down prep card (always shown, N/A when empty) ────────────────────────
function D2PrepCard({ title, subtitle, subtitleColor, run, pass, rpo, n, pers }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden", flex: 1, minWidth: 150,
    }}>
      <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)",
        padding: "8px 12px" }}>
        <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{title}</div>
        <div style={{ color: subtitleColor || "var(--accent)", fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: .5, marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        {n === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: 13, textAlign: "center",
            padding: "14px 0", fontWeight: 600 }}>N/A</div>
        ) : (
          <>
            <RPOBar run={run} pass={pass} rpo={rpo} n={n} />
            <div style={{ color: "var(--text3)", fontSize: 10, textAlign: "right", marginTop: 3 }}>
              n={n}
            </div>
            <PersonnelBreakdown pers={pers} />
          </>
        )}
      </div>
    </div>
  );
}

const D2_PREV_ROWS = [
  { key: "afterPass", label: "After Pass", color: PASS_COLOR },
  { key: "afterRun",  label: "After Run",  color: RUN_COLOR  },
  { key: "afterRpo",  label: "After RPO",  color: RPO_COLOR  },
];

function D2PrepSection({ d2ByPrevType }) {
  return (
    <>
      {D2_PREV_ROWS.map(({ key, label, color }) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color,
            textTransform: "uppercase", letterSpacing: .6,
            marginBottom: 6, paddingLeft: 2,
          }}>
            {label}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {(d2ByPrevType[key] || []).map((t, i) => (
              <D2PrepCard
                key={i}
                title={t.title}
                subtitle={label}
                subtitleColor={color}
                run={t.run} pass={t.pass} rpo={t.rpo} n={t.n}
                pers={t.pers}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Tile row (prep mode) ──────────────────────────────────────────────────────
function TileRow({ tiles, emptyMsg = "No data." }) {
  if (!tiles || tiles.length === 0) {
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 12px" }}>{emptyMsg}</p>;
  }
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "nowrap",
      overflowX: "auto", paddingBottom: 6, marginBottom: 4 }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ flex: "0 0 190px" }}>
          <TendCard title={t.title} subtitle={t.subtitle} run={t.run} pass={t.pass} rpo={t.rpo} n={t.n}>
            <PersonnelBreakdown pers={t.pers} />
          </TendCard>
        </div>
      ))}
    </div>
  );
}

// ── 2nd Down grid cell (live mode) ────────────────────────────────────────────
function D2Cell({ data, isHeader = false, style = {} }) {
  if (isHeader) {
    return (
      <div style={{
        background: "var(--surface2)", padding: "8px 10px",
        fontWeight: 700, fontSize: 12, color: "var(--text2)",
        borderBottom: "1px solid var(--border)",
        textAlign: "center", ...style,
      }}>
        {data}
      </div>
    );
  }
  const { run = 0, pass = 0, rpo = 0, n = 0 } = data || {};
  return (
    <div style={{
      padding: "8px 10px", borderBottom: "1px solid var(--border)",
      borderLeft: "1px solid var(--border)", ...style,
    }}>
      {n === 0 ? (
        <div style={{ color: "var(--text3)", fontSize: 11, textAlign: "center" }}>—</div>
      ) : (
        <>
          <RPOBar run={run} pass={pass} rpo={rpo} n={n} height={22} fontSize={10} />
          <div style={{ color: "var(--text3)", fontSize: 9, textAlign: "right", marginTop: 2 }}>
            n={n}
          </div>
        </>
      )}
    </div>
  );
}

// ── 3rd/4th Down tile row (live mode) ────────────────────────────────────────
function DownTileRow({ tiles, emptyMsg }) {
  if (!tiles || tiles.length === 0) {
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 12px" }}>{emptyMsg}</p>;
  }
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
      {tiles.map((t, i) => (
        <TendCard key={i} title={t.title} run={t.run} pass={t.pass} rpo={t.rpo} n={t.n}>
          <PersonnelBreakdown pers={t.pers} />
        </TendCard>
      ))}
    </div>
  );
}

// ── Filter box (shared) ───────────────────────────────────────────────────────
function FilterBox({ data, persFilter, fpFilter, driveFilter, onTogglePers, onClearPers,
                     onToggleFP, onClearFP, onToggleDrive, showDrive, viewMode, onSetViewMode }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "12px 16px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text2)",
          textTransform: "uppercase", letterSpacing: .5 }}>Filters</div>
        {onSetViewMode && (
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            {[["charts", "Charts & Boxes"], ["table", "Table"]].map(([mode, label]) => (
              <button key={mode} onClick={() => onSetViewMode(mode)} style={{
                padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: "none", borderRight: mode === "charts" ? "1px solid var(--border)" : "none",
                background: viewMode === mode ? "var(--accent)" : "var(--surface2)",
                color: viewMode === mode ? "#fff" : "var(--text3)",
              }}>{label}</button>
            ))}
          </div>
        )}
      </div>
      <ChipFilter label="Personnel" options={data.persOptions}
        selected={persFilter} onToggle={onTogglePers} onClearAll={onClearPers} />
      <ChipFilter label="Field Position" options={data.fpOptions}
        selected={fpFilter} onToggle={onToggleFP} onClearAll={onClearFP} />
      {showDrive && data.driveOptions?.length > 0 && (
        <ChipFilter label="Drive" options={data.driveOptions}
          selected={driveFilter} onToggle={onToggleDrive}
          onClearAll={() => driveFilter.forEach(d => onToggleDrive(d))} />
      )}
    </div>
  );
}

// ── Shared table styles ───────────────────────────────────────────────────────
const TH  = { padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#fff",
  textAlign: "right", whiteSpace: "nowrap", letterSpacing: .3 };
const TD  = { padding: "6px 10px", fontSize: 12, textAlign: "right", color: "var(--text)" };
const TDL = { ...TD, textAlign: "left", fontWeight: 600 };

// ── Situation table (plain table with personnel sub-rows) ─────────────────────
const COLS = ["Situation", "N", "Run", "Run%", "RPO", "RPO%", "Pass", "Pass%"];

function SituationTable({ caption, rows }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 6,
        textTransform: "uppercase", letterSpacing: .5 }}>{caption}</div>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: GREEN }}>
              {COLS.map((c, i) => (
                <th key={i} style={{ ...TH, textAlign: i === 0 ? "left" : "right" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{
                background: row.sub ? "var(--surface2)" : "var(--surface)",
                borderTop: "1px solid var(--border)",
              }}>
                {row.cells}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div style={{ padding: "12px 16px", color: "var(--text3)", fontSize: 12 }}>No data.</div>
        )}
      </div>
    </div>
  );
}

// Build a main row + personnel sub-rows for a tendency item
function buildTableRows(labelEl, { n, run, pass, rpo, pers }, isFirst) {
  const sep = isFirst ? "none" : "2px solid var(--border)";
  function pctTd(key, val, color) {
    return <td key={key} style={{ ...TD, fontWeight: 700, borderTop: sep, color: val > 70 ? color : "var(--text)" }}>{val}%</td>;
  }
  const rows = [{
    sub: false,
    cells: [
      <td key="lbl" style={{ ...TDL, borderTop: sep }}>{labelEl}</td>,
      <td key="n"   style={{ ...TD,  borderTop: sep }}>{n}</td>,
      <td key="r"   style={{ ...TD,  borderTop: sep }}>{Math.round(run  * n / 100)}</td>,
      pctTd("rp",  run,  RUN_COLOR),
      <td key="o"   style={{ ...TD,  borderTop: sep }}>{Math.round(rpo  * n / 100)}</td>,
      pctTd("op",  rpo,  RPO_COLOR),
      <td key="p"   style={{ ...TD,  borderTop: sep }}>{Math.round(pass * n / 100)}</td>,
      pctTd("pp",  pass, PASS_COLOR),
    ],
  }];
  (pers || []).forEach((p, j) => {
    const tot  = p.run + p.pass + p.rpo;
    const rPct = tot ? Math.round(p.run  / tot * 100) : 0;
    const pPct = tot ? Math.round(p.pass / tot * 100) : 0;
    const oPct = 100 - rPct - pPct;
    rows.push({ sub: true, cells: [
      <td key="lbl" style={{ ...TDL, paddingLeft: 22, fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>↳ {p.pers}</td>,
      <td key="n"   style={{ ...TD, fontSize: 11, color: "var(--text3)" }}>{p.n}</td>,
      <td key="r"   style={{ ...TD, fontSize: 11 }}>{p.run}</td>,
      <td key="rp"  style={{ ...TD, fontSize: 11, fontWeight: 700, color: rPct > 70 ? RUN_COLOR  : "var(--text3)" }}>{rPct}%</td>,
      <td key="o"   style={{ ...TD, fontSize: 11 }}>{p.rpo}</td>,
      <td key="op"  style={{ ...TD, fontSize: 11, fontWeight: 700, color: oPct > 70 ? RPO_COLOR  : "var(--text3)" }}>{oPct}%</td>,
      <td key="p"   style={{ ...TD, fontSize: 11 }}>{p.pass}</td>,
      <td key="pp"  style={{ ...TD, fontSize: 11, fontWeight: 700, color: pPct > 70 ? PASS_COLOR : "var(--text3)" }}>{pPct}%</td>,
    ]});
  });
  return rows;
}

const SUBTYPE_COLOR = { run: "var(--run-color)", pass: "var(--pass-color)", rpo: "var(--rpo-color)" };
const SUBTYPE_LABEL = { run: "after Run", pass: "after Pass", rpo: "after RPO" };

function P10Label({ code, label, subtype }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 3,
        padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{code}</span>
      {label}
      {subtype && (
        <span style={{ fontSize: 10, fontWeight: 700, color: SUBTYPE_COLOR[subtype] }}>
          {SUBTYPE_LABEL[subtype]}
        </span>
      )}
    </span>
  );
}

function PrepTableView({ data }) {
  // P&10
  const p10Rows = [];
  (data.p10BySituation || []).forEach((item, i) => {
    buildTableRows(
      <P10Label code={item.code} label={item.label} subtype={item.subtype} />,
      item, i === 0
    ).forEach(r => p10Rows.push(r));
  });

  // 2nd down
  const d2Rows = [];
  const D2_PREV = [
    { key: "afterPass", label: "after Pass", color: PASS_COLOR },
    { key: "afterRun",  label: "after Run",  color: RUN_COLOR  },
    { key: "afterRpo",  label: "after RPO",  color: RPO_COLOR  },
  ];
  let d2First = true;
  D2_PREV.forEach(({ key, label, color }) => {
    (data.d2ByPrevType?.[key] || []).forEach(item => {
      buildTableRows(
        <span>{item.title} <span style={{ fontSize: 10, color, fontWeight: 700 }}>{label}</span></span>,
        item, d2First
      ).forEach(r => d2Rows.push(r));
      d2First = false;
    });
  });

  // 3rd down
  const d3Rows = [];
  (data.d3Buckets || []).forEach((item, i) => {
    buildTableRows(<span>{item.title}</span>, item, i === 0).forEach(r => d3Rows.push(r));
  });

  return (
    <>
      <SituationTable caption="P&10 — Situational 1st & 10" rows={p10Rows} />
      <SituationTable caption="2nd Down & Distance"          rows={d2Rows} />
      <SituationTable caption="3rd Down Groups"              rows={d3Rows} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREP VIEW (P&10 tiles)
// ══════════════════════════════════════════════════════════════════════════════
function PrepCallsheet({ rows }) {
  const [persFilter, setPersFilter] = useState([]);
  const [fpFilter,   setFpFilter]   = useState([]);
  const [viewMode,   setViewMode]   = useState("charts");

  const data = useMemo(
    () => computeCallsheetDataPrep(rows, { persFilter, fpFilter }),
    [rows, persFilter, fpFilter]
  );

  function togglePers(p) { setPersFilter(prev => prev.includes(p) ? prev.filter(x=>x!==p) : [...prev,p]); }
  function toggleFP(z)   { setFpFilter(prev   => prev.includes(z) ? prev.filter(x=>x!==z) : [...prev,z]); }

  return (
    <>
      {rows.length > 0 && (
        <FilterBox data={data} persFilter={persFilter} fpFilter={fpFilter}
          driveFilter={[]} onTogglePers={togglePers} onClearPers={() => setPersFilter([])}
          onToggleFP={toggleFP} onClearFP={() => setFpFilter([])}
          onToggleDrive={() => {}} showDrive={false}
          viewMode={viewMode} onSetViewMode={setViewMode} />
      )}
      {viewMode === "table" ? (
        <PrepTableView data={data} />
      ) : (
        <>
          <SectionHeader title="P&10 — Situational 1st & 10" />
          {(!data.p10BySituation || data.p10BySituation.length === 0) ? (
            <div style={{ color: "var(--text3)", fontSize: 13, padding: "12px 0" }}>
              No P&amp;10 data. Fill the P&amp;10 column with P/K/T/E/L/S.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {data.p10BySituation.map((item, idx) => (
                <div key={`${item.code}-${item.subtype || idx}`} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, overflow: "hidden", flex: "1 1 180px", minWidth: 160,
                }}>
                  <div style={{
                    background: "var(--surface2)", borderBottom: "1px solid var(--border)",
                    padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                  }}>
                    <span style={{
                      background: "var(--accent)", color: "#fff", borderRadius: 4,
                      padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    }}>{item.code}</span>
                    <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 600 }}>{item.label}</span>
                    {item.subtype && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: SUBTYPE_COLOR[item.subtype] }}>
                        {SUBTYPE_LABEL[item.subtype]}
                      </span>
                    )}
                    <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: "auto" }}>n={item.n}</span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <RPOBar run={item.run} pass={item.pass} rpo={item.rpo} n={item.n} />
                    <PersonnelBreakdown pers={item.pers} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <SectionHeader title="2nd Down & Distance" />
          <D2PrepSection d2ByPrevType={data.d2ByPrevType} />
          <SectionHeader title="3rd Down Groups" />
          {(!data.d3Buckets || data.d3Buckets.length === 0) ? (
            <div style={{ color: "var(--text3)", fontSize: 13, padding: "12px 0" }}>No 3rd down data.</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {data.d3Buckets.map(({ title, n, run, pass, rpo, pers }) => (
                <div key={title} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, overflow: "hidden", flex: "1 1 160px", minWidth: 140,
                }}>
                  <div style={{
                    background: "var(--surface2)", borderBottom: "1px solid var(--border)",
                    padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 700 }}>{title}</span>
                    <span style={{ color: "var(--text3)", fontSize: 11 }}>n={n}</span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <RPOBar run={run} pass={pass} rpo={rpo} n={n} />
                    <PersonnelBreakdown pers={pers} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE VIEW (Drive Opener / 1st&10 / After Conversion + 2nd Down grid)
// ══════════════════════════════════════════════════════════════════════════════
export function LiveCallsheet({ rows, d2Mode = "grid" }) {
  const [persFilter,  setPersFilter]  = useState([]);
  const [fpFilter,    setFpFilter]    = useState([]);
  const [driveFilter, setDriveFilter] = useState([]);
  const [convToggle,  setConvToggle]  = useState("all");

  const data = useMemo(
    () => computeCallsheetData(rows, { persFilter, fpFilter, driveFilter }),
    [rows, persFilter, fpFilter, driveFilter]
  );

  function togglePers(p)  { setPersFilter(prev  => prev.includes(p)  ? prev.filter(x=>x!==p)  : [...prev,p]);  }
  function toggleFP(z)    { setFpFilter(prev    => prev.includes(z)  ? prev.filter(x=>x!==z)  : [...prev,z]);  }
  function toggleDrive(d) { setDriveFilter(prev => prev.includes(d)  ? prev.filter(x=>x!==d)  : [...prev,d]);  }

  const convData = {
    all:  data.d1Section.afterConv.all,
    pass: data.d1Section.afterConv.pass,
    run:  data.d1Section.afterConv.run,
    rpo:  data.d1Section.afterConv.rpo,
  }[convToggle] || data.d1Section.afterConv.all;

  // Only 3 rows: After Pass / After Run / After RPO
  const D2_ROW_LABELS = [
    { key: "afterPass", label: "After Pass" },
    { key: "afterRun",  label: "After Run"  },
    { key: "afterRpo",  label: "After RPO"  },
  ];

  return (
    <>
      {rows.length > 0 && (
        <FilterBox data={data} persFilter={persFilter} fpFilter={fpFilter}
          driveFilter={driveFilter}
          onTogglePers={togglePers} onClearPers={() => setPersFilter([])}
          onToggleFP={toggleFP} onClearFP={() => setFpFilter([])}
          onToggleDrive={toggleDrive}
          showDrive={data.driveOptions?.length > 0} />
      )}

      {/* 1st Down */}
      <SectionHeader title="1st Down" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <TendCard title="Drive Opener" subtitle="First play of each drive"
          run={data.d1Section.driveOpener.run} pass={data.d1Section.driveOpener.pass}
          rpo={data.d1Section.driveOpener.rpo} n={data.d1Section.driveOpener.n} />

        <TendCard title="1st & 10" subtitle="Standard first down"
          run={data.d1Section.d1_10.run} pass={data.d1Section.d1_10.pass}
          rpo={data.d1Section.d1_10.rpo} n={data.d1Section.d1_10.n} />

        <TendCard title="After Conversion" subtitle="1st down earned by moving chains"
          run={convData.run} pass={convData.pass} rpo={convData.rpo} n={convData.n}>
          <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              { k: "all",  label: "All"       },
              { k: "pass", label: "After Pass" },
              { k: "run",  label: "After Run"  },
              { k: "rpo",  label: "After RPO"  },
            ].map(({ k, label }) => (
              <button key={k} onClick={() => setConvToggle(k)} style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20,
                border: `1px solid ${convToggle === k ? "var(--accent)" : "var(--border)"}`,
                background: convToggle === k ? "var(--accent)" : "var(--surface2)",
                color: convToggle === k ? "#fff" : "var(--text3)",
                cursor: "pointer",
              }}>
                {label}
              </button>
            ))}
          </div>
        </TendCard>
      </div>

      {/* 2nd Down */}
      <SectionHeader title="2nd Down" />
      {data.d2Section.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 12px" }}>No 2nd down data found.</p>
      ) : d2Mode === "tiles" ? (
        /* Tile mode: 3 rows × 4 buckets, each with Personnel breakdown */
        <D2PrepSection d2ByPrevType={{
          afterPass: data.d2Section.map(b => ({ title: b.label, ...b.afterPass })),
          afterRun:  data.d2Section.map(b => ({ title: b.label, ...b.afterRun  })),
          afterRpo:  data.d2Section.map(b => ({ title: b.label, ...b.afterRpo  })),
        }} />
      ) : (
        /* Default grid mode */
        <div style={{ overflowX: "auto", marginBottom: 8 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `170px repeat(${data.d2Section.length}, minmax(150px, 1fr))`,
            border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
            minWidth: 400,
          }}>
            <D2Cell data="" isHeader />
            {data.d2Section.map(b => (
              <D2Cell key={b.label} data={b.label} isHeader />
            ))}
            {D2_ROW_LABELS.map(({ key, label }, ri) => (
              <>
                <div key={`lbl-${key}`} style={{
                  padding: "8px 10px",
                  background: ri % 2 === 0 ? "var(--surface2)" : "var(--surface)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "center",
                  fontSize: 12, fontWeight: 700, color: "var(--text2)",
                }}>
                  {label}
                </div>
                {data.d2Section.map(b => (
                  <D2Cell
                    key={`${key}-${b.label}`}
                    data={b[key]}
                    style={{ background: ri % 2 === 0 ? "var(--surface2)" : "var(--surface)" }}
                  />
                ))}
              </>
            ))}
          </div>
        </div>
      )}

      {/* 3rd Down */}
      <SectionHeader title="3rd Down" />
      <DownTileRow tiles={data.d3Tiles} emptyMsg="No 3rd down data found." />

      {/* 4th Down (conditional) */}
      {data.d4Tiles.length > 0 && (
        <>
          <SectionHeader title="4th Down" />
          <DownTileRow tiles={data.d4Tiles} emptyMsg="No 4th down data found." />
        </>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Callsheet() {
  const { selectedGame, mode, playRows, liveRows } = useApp();
  const rows  = mode === "live" ? liveRows : playRows;
  const noData = !selectedGame || rows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
      <h2 style={{ color: "var(--text)", margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>
        Callsheet Tendencies
      </h2>
      <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 16px" }}>
        {mode === "live"
          ? "Live situational tendencies — Drive Opener · 1st & 10 · After Conversion"
          : "Situational play tendency analysis by P&10, down & distance."}
      </p>

      {noData ? (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 48, textAlign: "center", color: "var(--text3)",
          fontSize: 14, marginTop: 24,
        }}>
          {!selectedGame ? "Select a game from the sidebar."
            : mode === "live" ? "No live data yet."
            : "No playdata uploaded. Go to Admin → Upload .xlsx"}
        </div>
      ) : mode === "live" ? (
        <LiveCallsheet rows={rows} />
      ) : (
        <PrepCallsheet rows={rows} />
      )}
    </div>
  );
}
