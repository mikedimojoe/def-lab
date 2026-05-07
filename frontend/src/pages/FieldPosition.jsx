import { useState, useMemo } from "react";
import { useApp }  from "../contexts/AppContext";
import DDTable     from "../components/DDTable";
import {
  rowDownGroup, DOWN_GROUP_ORDER, DOWN_GROUP_PARENT, uniqueValuesByFreq,
} from "../lib/dataEngine";

// ── Down & Distance / Field Position Analysis ─────────────────────────────────

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#D4782A";
const ACCENT     = "#5CBF8A";
const GREEN      = "#154734";

const MAX_CHIPS  = 8;
const DOWN_TABS  = ["1st","2nd","3rd","4th"];

// Field position zones — fixed order
const FP_ORDER = [
  "HIGH REDZONE",
  "LOW REDZONE",
  "PLUS TERRITORY",
  "MINUS TERRITORY",
  "BACKED UP",
];
const FP_LABEL = {
  "HIGH REDZONE":    "High RZ",
  "LOW REDZONE":     "Low RZ",
  "PLUS TERRITORY":  "+Territory",
  "MINUS TERRITORY": "−Territory",
  "BACKED UP":       "Backed Up",
};
// Colors to make FP chips visually distinct
const FP_COLOR = {
  "HIGH REDZONE":    "#C0392B",
  "LOW REDZONE":     "#E67E22",
  "PLUS TERRITORY":  "#27AE60",
  "MINUS TERRITORY": "#2980B9",
  "BACKED UP":       "#8E44AD",
};

function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }

function playType(r) {
  const pt = String(r["PLAY TYPE CALLED"] || r["PLAY TYPE"] || "").trim().toLowerCase();
  if (pt === "run")  return "Run";
  if (pt === "pass") return "Pass";
  if (pt === "rpo")  return "RPO";
  return "";
}

// Local buildDDRows (dataEngine version not exported)
function buildDDRows(rows) {
  const byGroup = {};
  rows.forEach(r => {
    const dg = rowDownGroup(r);
    if (!dg) return;
    if (!byGroup[dg]) byGroup[dg] = [];
    byGroup[dg].push(r);
  });
  return DOWN_GROUP_ORDER
    .filter(dg => byGroup[dg])
    .map(dg => {
      const dgRows = byGroup[dg];
      const run  = dgRows.filter(r => playType(r) === "Run").length;
      const pass = dgRows.filter(r => playType(r) === "Pass").length;
      const rpo  = dgRows.filter(r => playType(r) === "RPO").length;
      return {
        downGroup: dg,
        parent:    DOWN_GROUP_PARENT[dg] || "",
        total:     dgRows.length,
        run,  runPct:  pct(run,  dgRows.length),
        pass, passPct: pct(pass, dgRows.length),
        rpo,  rpoPct:  pct(rpo,  dgRows.length),
      };
    });
}

// ── Filter chip row ───────────────────────────────────────────────────────────
function FilterChips({ label, options, selected, onToggle, onClear, colorFn }) {
  const [expanded, setExpanded] = useState(false);
  const visible     = expanded ? options : options.slice(0, MAX_CHIPS);
  const allSelected = selected.length === 0;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          color: "var(--text3)", fontSize: 10, fontWeight: 700,
          letterSpacing: .7, textTransform: "uppercase", minWidth: 90,
        }}>{label}</span>

        {/* ALL chip */}
        <button onClick={onClear} style={{
          background: allSelected ? GREEN : "var(--surface2)",
          color:      allSelected ? "#fff" : "var(--text3)",
          border:     allSelected ? `1px solid ${GREEN}` : "1px solid var(--border)",
          borderRadius: 20, padding: "3px 11px", fontSize: 11,
          fontWeight: 700, cursor: "pointer", transition: "all .12s",
        }}>All</button>

        {visible.map(opt => {
          const active = selected.includes(opt);
          const col    = colorFn ? colorFn(opt) : ACCENT;
          return (
            <button key={opt} onClick={() => onToggle(opt)} style={{
              background: active ? `${col}22` : "var(--surface2)",
              color:      active ? col         : "var(--text3)",
              border:     active ? `1px solid ${col}` : "1px solid var(--border)",
              borderRadius: 20, padding: "3px 11px", fontSize: 11,
              fontWeight: active ? 700 : 400, cursor: "pointer",
              transition: "all .12s",
            }}>
              {colorFn ? (FP_LABEL[opt] || opt) : opt}
            </button>
          );
        })}

        {options.length > MAX_CHIPS && (
          <button onClick={() => setExpanded(e => !e)} style={{
            background: "transparent", color: "var(--text3)",
            border: "1px solid var(--border)", borderRadius: 20,
            padding: "3px 10px", fontSize: 10, cursor: "pointer",
          }}>
            {expanded ? "▲ less" : `+${options.length - MAX_CHIPS} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tendency detail cards per down group ──────────────────────────────────────
function TendencyGrid({ rows, activeDown }) {
  const groups = DOWN_GROUP_ORDER.filter(dg => DOWN_GROUP_PARENT[dg] === activeDown);

  const data = useMemo(() => {
    return groups.map(dg => {
      const dgRows = rows.filter(r => rowDownGroup(r) === dg);
      if (!dgRows.length) return null;

      const run   = dgRows.filter(r => playType(r) === "Run").length;
      const pass  = dgRows.filter(r => playType(r) === "Pass").length;
      const rpo   = dgRows.filter(r => playType(r) === "RPO").length;
      const total = dgRows.length;

      const formCounts = {};
      dgRows.forEach(r => {
        const f = String(r["OFF FORM"] || "").trim();
        if (f) formCounts[f] = (formCounts[f] || 0) + 1;
      });
      const topForms = Object.entries(formCounts).sort((a,b) => b[1]-a[1]).slice(0,3);

      const playCounts = {};
      dgRows.forEach(r => {
        const p = String(r["OFF PLAY"] || "").trim();
        if (p) playCounts[p] = (playCounts[p] || 0) + 1;
      });
      const topPlays = Object.entries(playCounts).sort((a,b) => b[1]-a[1]).slice(0,3);

      const persCounts = {};
      dgRows.forEach(r => {
        const p = String(r["PERSONNEL"] || "").trim();
        if (p) persCounts[p] = (persCounts[p] || 0) + 1;
      });
      const topPers = Object.entries(persCounts).sort((a,b) => b[1]-a[1]).slice(0,3);

      return {
        dg, total,
        runPct:  pct(run,  total),
        passPct: pct(pass, total),
        rpoPct:  pct(rpo,  total),
        topForms, topPlays, topPers,
      };
    }).filter(Boolean);
  }, [rows, activeDown]);

  if (!data.length) return (
    <div style={{ color: "var(--text3)", fontSize: 12, padding: "16px 0" }}>
      No {activeDown} down plays in current selection.
    </div>
  );

  const hasRPO = data.some(d => d.rpoPct > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {data.map(d => (
        <div key={d.dg} style={{
          background: "var(--bg)", borderRadius: 10,
          border: "1px solid var(--border)", padding: "14px 16px",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>{d.dg}</span>
            <span style={{ color: "var(--text3)", fontSize: 10 }}>{d.total} plays</span>
          </div>

          <div style={{ display: "flex", gap: 10, fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: RUN_COLOR,  fontWeight: 700 }}>Run {d.runPct}%</span>
            {hasRPO && d.rpoPct > 0 && (
              <span style={{ color: RPO_COLOR, fontWeight: 700 }}>RPO {d.rpoPct}%</span>
            )}
            <span style={{ color: PASS_COLOR, fontWeight: 700 }}>Pass {d.passPct}%</span>
          </div>

          <div style={{
            display: "flex", height: 8, borderRadius: 4,
            overflow: "hidden", gap: 1, marginBottom: 12,
          }}>
            <div style={{ flex: d.runPct,  background: RUN_COLOR,  minWidth: d.runPct  > 0 ? 3 : 0 }} />
            {d.rpoPct > 0 && <div style={{ flex: d.rpoPct, background: RPO_COLOR, minWidth: 3 }} />}
            <div style={{ flex: d.passPct, background: PASS_COLOR, minWidth: d.passPct > 0 ? 3 : 0 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.topForms.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 9, fontWeight: 700,
                  letterSpacing: .5, marginBottom: 4 }}>FORMATIONS</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {d.topForms.map(([f, c]) => (
                    <span key={f} style={{
                      background: "rgba(92,191,138,.1)", color: ACCENT,
                      fontSize: 10, padding: "1px 7px", borderRadius: 4,
                    }}>{f} <span style={{ color: "var(--text3)", fontWeight: 400 }}>{c}×</span></span>
                  ))}
                </div>
              </div>
            )}
            {d.topPlays.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 9, fontWeight: 700,
                  letterSpacing: .5, marginBottom: 4 }}>PLAY CALLS</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {d.topPlays.map(([p, c]) => (
                    <span key={p} style={{
                      background: "var(--surface2)", color: "var(--text2)",
                      border: "1px solid var(--border)",
                      fontSize: 10, padding: "1px 7px", borderRadius: 4,
                    }}>{p} <span style={{ color: "var(--text3)", fontWeight: 400 }}>{c}×</span></span>
                  ))}
                </div>
              </div>
            )}
            {d.topPers.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 9, fontWeight: 700,
                  letterSpacing: .5, marginBottom: 4 }}>PERSONNEL</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {d.topPers.map(([p, c]) => (
                    <span key={p} style={{
                      background: "var(--surface2)", color: "var(--text3)",
                      border: "1px solid var(--border)",
                      fontSize: 10, padding: "1px 7px", borderRadius: 4,
                    }}>{p} <span style={{ fontWeight: 700, color: "var(--text2)" }}>{c}×</span></span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ rows, totalRows, selFP }) {
  const run   = rows.filter(r => playType(r) === "Run").length;
  const pass  = rows.filter(r => playType(r) === "Pass").length;
  const rpo   = rows.filter(r => playType(r) === "RPO").length;
  const total = rows.length;
  const hasRPO = rpo > 0;

  if (!total) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      background: "var(--surface2)", borderRadius: 10,
      border: "1px solid var(--border)", padding: "10px 16px",
      marginBottom: 20, flexWrap: "wrap",
    }}>
      <div>
        <div style={{ color: "var(--text3)", fontSize: 9, letterSpacing: .6, marginBottom: 2 }}>PLAYS</div>
        <div style={{ color: "var(--text)", fontWeight: 700, fontSize: 18 }}>
          {total}
          {total < totalRows && (
            <span style={{ color: "var(--text3)", fontSize: 11, fontWeight: 400, marginLeft: 6 }}>
              of {totalRows}
            </span>
          )}
        </div>
        {/* Active FP zone pills */}
        {selFP.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {selFP.map(fp => (
              <span key={fp} style={{
                background: `${FP_COLOR[fp] || ACCENT}22`,
                color: FP_COLOR[fp] || ACCENT,
                border: `1px solid ${FP_COLOR[fp] || ACCENT}`,
                fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 700,
              }}>{FP_LABEL[fp] || fp}</span>
            ))}
          </div>
        )}
      </div>

      {/* Bar */}
      <div style={{ flex: 1, minWidth: 120 }}>
        <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1 }}>
          <div style={{ flex: pct(run, total),  background: RUN_COLOR,  minWidth: run  > 0 ? 3 : 0 }} />
          {hasRPO && <div style={{ flex: pct(rpo, total), background: RPO_COLOR, minWidth: 3 }} />}
          <div style={{ flex: pct(pass, total), background: PASS_COLOR, minWidth: pass > 0 ? 3 : 0 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text3)", fontSize: 9, letterSpacing: .5 }}>RUN</div>
          <div style={{ color: RUN_COLOR,  fontWeight: 800, fontSize: 16 }}>{pct(run,  total)}%</div>
          <div style={{ color: "var(--text3)", fontSize: 10 }}>{run}</div>
        </div>
        {hasRPO && (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "var(--text3)", fontSize: 9, letterSpacing: .5 }}>RPO</div>
            <div style={{ color: RPO_COLOR, fontWeight: 800, fontSize: 16 }}>{pct(rpo, total)}%</div>
            <div style={{ color: "var(--text3)", fontSize: 10 }}>{rpo}</div>
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text3)", fontSize: 9, letterSpacing: .5 }}>PASS</div>
          <div style={{ color: PASS_COLOR, fontWeight: 800, fontSize: 16 }}>{pct(pass, total)}%</div>
          <div style={{ color: "var(--text3)", fontSize: 10 }}>{pass}</div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FieldPosition() {
  const { selectedGame, playRows, liveRows, mode } = useApp();
  const allRows = mode === "live" ? liveRows : playRows;

  // Only offense
  const offense = useMemo(() => allRows.filter(r => r["ODK"] === "O"), [allRows]);

  // Available filter options (by frequency)
  const persOptions = useMemo(() => uniqueValuesByFreq(offense, "PERSONNEL"), [offense]);
  const formOptions = useMemo(() => uniqueValuesByFreq(offense, "OFF FORM"),  [offense]);

  // FP options — use fixed order, only show zones that actually have plays
  const fpOptions = useMemo(() => {
    const present = new Set(offense.map(r => String(r["FP GROUP"] || "").trim()).filter(Boolean));
    return FP_ORDER.filter(fp => present.has(fp));
  }, [offense]);

  // Selected filters (empty = All)
  const [selPers, setSelPers] = useState([]);
  const [selForm, setSelForm] = useState([]);
  const [selFP,   setSelFP]   = useState([]);

  // Active down tab
  const [activeDown, setActiveDown] = useState("1st");

  function togglePers(v) { setSelPers(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]); }
  function toggleForm(v) { setSelForm(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]); }
  function toggleFP(v)   { setSelFP(p =>   p.includes(v) ? p.filter(x => x !== v) : [...p, v]); }

  // Filtered rows
  const filtered = useMemo(() => {
    return offense.filter(r => {
      if (selPers.length > 0 && !selPers.includes(String(r["PERSONNEL"] || "").trim())) return false;
      if (selForm.length > 0 && !selForm.includes(String(r["OFF FORM"]  || "").trim())) return false;
      if (selFP.length   > 0 && !selFP.includes(  String(r["FP GROUP"]  || "").trim())) return false;
      return true;
    });
  }, [offense, selPers, selForm, selFP]);

  const ddRows   = useMemo(() => buildDDRows(filtered), [filtered]);
  const noData   = offense.length === 0;
  const anyFilter = selPers.length > 0 || selForm.length > 0 || selFP.length > 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "var(--text)", margin: "0 0 5px", fontSize: 20, fontWeight: 700 }}>
          Down &amp; Distance
        </h2>
        <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>
          R/P/RPO tendencies by down group — filter by Field Position, Personnel and Formation.
          {selectedGame
            ? <> &nbsp;·&nbsp;
                <strong style={{ color: ACCENT }}>W{selectedGame.week} — {selectedGame.opponent}</strong>
                {" "}({mode})
              </>
            : <> &nbsp;·&nbsp; Select a game from the sidebar.</>}
        </p>
      </div>

      {/* Filters */}
      {!noData && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20,
        }}>
          {/* Field Position filter */}
          {fpOptions.length > 0 && (
            <FilterChips
              label="Field Position"
              options={fpOptions}
              selected={selFP}
              onToggle={toggleFP}
              onClear={() => setSelFP([])}
              colorFn={fp => FP_COLOR[fp] || ACCENT}
            />
          )}

          <FilterChips
            label="Personnel"
            options={persOptions}
            selected={selPers}
            onToggle={togglePers}
            onClear={() => setSelPers([])}
          />

          <FilterChips
            label="Formation"
            options={formOptions}
            selected={selForm}
            onToggle={toggleForm}
            onClear={() => setSelForm([])}
          />

          {anyFilter && (
            <button
              onClick={() => { setSelPers([]); setSelForm([]); setSelFP([]); }}
              style={{
                marginTop: 4, background: "transparent",
                color: "var(--text3)", border: "none",
                fontSize: 11, cursor: "pointer", padding: "2px 0",
                textDecoration: "underline",
              }}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {noData ? (
        <div style={{
          color: "var(--text3)", fontSize: 13,
          padding: "48px 0", textAlign: "center",
        }}>
          No play data. Upload a game or switch to Live mode.
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <SummaryBar rows={filtered} totalRows={offense.length} selFP={selFP} />

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20, alignItems: "start" }}>

            {/* Left: D&D Table */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700,
                letterSpacing: .7, textTransform: "uppercase", marginBottom: 12 }}>
                Down &amp; Distance Breakdown
              </div>
              {ddRows.length > 0
                ? <DDTable rows={ddRows} showTotal={true} />
                : <p style={{ color: "var(--text3)", fontSize: 12, margin: 0 }}>
                    No data for current filter.
                  </p>
              }
            </div>

            {/* Right: Tendency cards */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "18px 20px",
            }}>
              <div style={{ display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
                <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700,
                  letterSpacing: .7, textTransform: "uppercase" }}>
                  Tendency Detail
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {DOWN_TABS.map(d => (
                    <button key={d} onClick={() => setActiveDown(d)}
                      style={{
                        background: activeDown === d ? GREEN : "var(--surface2)",
                        color:      activeDown === d ? "#fff" : "var(--text3)",
                        border: "none", borderRadius: 6, padding: "4px 12px",
                        fontSize: 11, fontWeight: 700, cursor: "pointer",
                        transition: "background .12s",
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <TendencyGrid rows={filtered} activeDown={activeDown} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
