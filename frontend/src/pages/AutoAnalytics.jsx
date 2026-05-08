import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { rowDownGroup, DOWN_GROUP_PARENT } from "../lib/dataEngine";

// ── Auto Analytics Lab ─────────────────────────────────────────────────────
// Admin-only. New analytics tools for a Defensive Coordinator.
// Each tool is self-contained, reads from the current game's play data.
// Inspired by: Hudl IQ, PFF, NFL Next Gen Stats, College Football Data API.

const ACCENT     = "#5CBF8A";
const GREEN      = "#154734";
const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#D4782A";

function pct(n, total) { return total ? Math.round(n / total * 100) : 0; }
function playTypePTC(r) {
  const pt = String(r["PLAY TYPE CALLED"] || r["PLAY TYPE"] || "").trim().toLowerCase();
  if (pt === "run") return "run"; if (pt === "pass") return "pass"; if (pt === "rpo") return "rpo";
  return pt;
}

function ToolCard({ title, source, description, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", marginBottom: 20,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", borderBottom: open ? "1px solid var(--border)" : "none",
        cursor: "pointer", background: "var(--surface2)",
      }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 700 }}>{title}</span>
            {source && (
              <span style={{
                background: "rgba(92,191,138,.12)", color: ACCENT,
                fontSize: 10, padding: "2px 8px", borderRadius: 8,
                border: "1px solid rgba(92,191,138,.2)",
              }}>inspired by {source}</span>
            )}
          </div>
          <p style={{ color: "var(--text3)", fontSize: 11, margin: 0 }}>{description}</p>
        </div>
        <span style={{ color: "var(--text3)" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding: "18px 20px" }}>{children}</div>}
    </div>
  );
}

function NoData() {
  return (
    <div style={{ color: "var(--text3)", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
      No play data. Upload a game or switch to Live mode.
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 1 — 3rd Down Tendency Matrix
// Critical for DC: what does offense run on 3rd down by distance bucket?
// Inspired by: PFF 3rd Down Success Rate, NFL Next Gen Stats
// ─────────────────────────────────────────────────────────────────────────────
const THIRD_BUCKETS = ["3rd & 1-2", "3rd & 3-4", "3rd & 5-7", "3rd & 8+"];

function ThirdDownMatrix({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");
  const data = useMemo(() => {
    return THIRD_BUCKETS.map(bucket => {
      const plays = offense.filter(r => rowDownGroup(r) === bucket);
      const run  = plays.filter(r => playTypePTC(r) === "run").length;
      const pass = plays.filter(r => playTypePTC(r) === "pass").length;
      const rpo  = plays.filter(r => playTypePTC(r) === "rpo").length;
      // Most common formations
      const formCounts = {};
      plays.forEach(r => { const f = r["OFF FORM"]?.trim(); if (f) formCounts[f] = (formCounts[f]||0)+1; });
      const topForms = Object.entries(formCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([f]) => f);
      // Most common play concepts
      const playCounts = {};
      plays.forEach(r => { const p = r["OFF PLAY"]?.trim(); if (p) playCounts[p] = (playCounts[p]||0)+1; });
      const topPlays = Object.entries(playCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([p]) => p);
      return { bucket, total: plays.length, run, pass, rpo, topForms, topPlays };
    }).filter(d => d.total > 0);
  }, [offense]);

  if (!data.length) return <NoData />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 8px" }}>
        Each row = one 3rd down distance bucket. Bar shows Run / RPO / Pass split. Critical for calling the right defense.
      </p>
      {data.map(d => {
        const runPct  = pct(d.run,  d.total);
        const passPct = pct(d.pass, d.total);
        const rpoPct  = pct(d.rpo,  d.total);
        return (
          <div key={d.bucket} style={{
            background: "var(--bg)", borderRadius: 10,
            border: "1px solid var(--border)", padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 700, width: 100 }}>
                {d.bucket}
              </span>
              <span style={{ color: "var(--text3)", fontSize: 11 }}>{d.total} plays</span>
              <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
                <span style={{ color: RUN_COLOR,  fontSize: 12, fontWeight: 700 }}>Run {runPct}%</span>
                {rpoPct > 0 && <span style={{ color: RPO_COLOR, fontSize: 12, fontWeight: 700 }}>RPO {rpoPct}%</span>}
                <span style={{ color: PASS_COLOR, fontSize: 12, fontWeight: 700 }}>Pass {passPct}%</span>
              </div>
            </div>
            {/* Bar */}
            <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1, marginBottom: 10 }}>
              <div style={{ flex: runPct,  background: RUN_COLOR,  minWidth: runPct  > 0 ? 3 : 0 }} />
              {rpoPct > 0 && <div style={{ flex: rpoPct, background: RPO_COLOR, minWidth: 3 }} />}
              <div style={{ flex: passPct, background: PASS_COLOR, minWidth: passPct > 0 ? 3 : 0 }} />
            </div>
            {/* Formations + plays */}
            <div style={{ display: "flex", gap: 20 }}>
              {d.topForms.length > 0 && (
                <div>
                  <div style={{ color: "var(--text3)", fontSize: 10, marginBottom: 3 }}>TOP FORMATIONS</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {d.topForms.map(f => (
                      <span key={f} style={{
                        background: "rgba(92,191,138,.12)", color: ACCENT,
                        fontSize: 10, padding: "2px 7px", borderRadius: 4,
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {d.topPlays.length > 0 && (
                <div>
                  <div style={{ color: "var(--text3)", fontSize: 10, marginBottom: 3 }}>TOP PLAYS</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {d.topPlays.map(p => (
                      <span key={p} style={{
                        background: "var(--surface2)", color: "var(--text2)",
                        fontSize: 10, padding: "2px 7px", borderRadius: 4,
                        border: "1px solid var(--border)",
                      }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 2 — Situational Tendency Table
// Down × Distance × Field Position matrix → what does offense run?
// Inspired by: Hudl IQ Tendency Reports, Catapult
// ─────────────────────────────────────────────────────────────────────────────
const FP_SHORT = {
  "HIGH REDZONE":    "HIGH RZ",
  "LOW REDZONE":     "LOW RZ",
  "PLUS TERRITORY":  "+TERR",
  "MINUS TERRITORY": "-TERR",
  "BACKED UP":       "BACKED UP",
};
const DOWN_LABELS = ["1st","2nd","3rd","4th"];

function SituationalMatrix({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");
  const [selDown, setSelDown] = useState("1st");

  const data = useMemo(() => {
    const filtered = offense.filter(r => {
      const dg = rowDownGroup(r);
      return DOWN_GROUP_PARENT[dg] === selDown || (!DOWN_GROUP_PARENT[dg] && dg.startsWith(selDown));
    });

    const fpZones = ["HIGH REDZONE","LOW REDZONE","PLUS TERRITORY","MINUS TERRITORY","BACKED UP"];
    const distBuckets = selDown === "1st"
      ? ["1st short", "1st & 10 (+)"]
      : selDown === "2nd"
        ? ["2nd & 1-3","2nd & 4-6","2nd & 9-7","2nd & 10+"]
        : selDown === "3rd"
          ? ["3rd & 1-2","3rd & 3-4","3rd & 5-7","3rd & 8+"]
          : ["4th & 1-2","4th & 3-4","4th & 5-7","4th & 8+"];

    return distBuckets.map(dist => {
      const dRows = filtered.filter(r => rowDownGroup(r) === dist);
      const byFP = fpZones.map(fp => {
        const fpRows = dRows.filter(r => String(r["FP GROUP"]||"").trim() === fp);
        const run  = fpRows.filter(r => playTypePTC(r) === "run").length;
        const pass = fpRows.filter(r => playTypePTC(r) === "pass").length;
        return { fp, total: fpRows.length, run, pass,
          runPct: pct(run, fpRows.length), passPct: pct(pass, fpRows.length) };
      }).filter(d => d.total > 0);

      const totalRun  = dRows.filter(r => playTypePTC(r) === "run").length;
      const totalPass = dRows.filter(r => playTypePTC(r) === "pass").length;
      return { dist, total: dRows.length, totalRun, totalPass, byFP };
    }).filter(d => d.total > 0);
  }, [offense, selDown]);

  if (!offense.length) return <NoData />;

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 12px" }}>
        Down × Distance × Field Position: what does the offense run in each situation?
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {DOWN_LABELS.map(d => (
          <button key={d} onClick={() => setSelDown(d)}
            style={{
              background: selDown === d ? GREEN : "var(--surface2)",
              color: selDown === d ? "#fff" : "var(--text3)",
              border: "none", borderRadius: 6, padding: "5px 14px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            {d}
          </button>
        ))}
      </div>
      {!data.length
        ? <div style={{ color: "var(--text3)", fontSize: 12 }}>No {selDown} down data.</div>
        : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={th}>Distance</th>
                <th style={th}>Plays</th>
                <th style={{ ...th, color: RUN_COLOR }}>Run%</th>
                <th style={{ ...th, color: PASS_COLOR }}>Pass%</th>
                <th style={th}>Field Position Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.dist} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={td}><strong>{row.dist}</strong></td>
                  <td style={{ ...td, color: "var(--text3)" }}>{row.total}</td>
                  <td style={{ ...td, color: RUN_COLOR, fontWeight: 700 }}>{pct(row.totalRun, row.total)}%</td>
                  <td style={{ ...td, color: PASS_COLOR, fontWeight: 700 }}>{pct(row.totalPass, row.total)}%</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {row.byFP.map(fp => (
                        <div key={fp.fp} style={{
                          background: "var(--bg)", borderRadius: 6,
                          padding: "3px 8px", border: "1px solid var(--border)",
                          fontSize: 10,
                        }}>
                          <span style={{ color: "var(--text3)" }}>{FP_SHORT[fp.fp] || fp.fp}: </span>
                          <span style={{ color: PASS_COLOR }}>{fp.passPct}%P</span>
                          <span style={{ color: "var(--text3)", margin: "0 2px" }}>/</span>
                          <span style={{ color: RUN_COLOR }}>{fp.runPct}%R</span>
                          <span style={{ color: "var(--text3)", marginLeft: 4 }}>({fp.total})</span>
                        </div>
                      ))}
                      {row.byFP.length === 0 && <span style={{ color: "var(--text3)" }}>—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 3 — Personnel Tendency by Field Position
// Which personnel does offense use where on the field?
// Inspired by: NFL Next Gen Stats coverage analysis
// ─────────────────────────────────────────────────────────────────────────────
const FP_ORDER = ["HIGH REDZONE","LOW REDZONE","PLUS TERRITORY","MINUS TERRITORY","BACKED UP"];

function PersonnelByFieldPosition({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");

  const data = useMemo(() => {
    const persMap = {};
    offense.forEach(r => {
      const pers = String(r["PERSONNEL"]||"").trim() || "—";
      const fp   = String(r["FP GROUP"]  ||"").trim() || "Unknown";
      if (!persMap[pers]) persMap[pers] = { total: 0, byFP: {} };
      persMap[pers].total++;
      persMap[pers].byFP[fp] = (persMap[pers].byFP[fp] || 0) + 1;
    });
    return Object.entries(persMap)
      .sort((a,b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([pers, d]) => ({ pers, ...d }));
  }, [offense]);

  const fpZones = [...new Set(offense.map(r => String(r["FP GROUP"]||"").trim()).filter(Boolean))];
  const orderedFP = FP_ORDER.filter(f => fpZones.includes(f));

  if (!data.length) return <NoData />;
  if (!orderedFP.length) return (
    <div style={{ color: "var(--text3)", fontSize: 12 }}>
      No FP GROUP data — enter YARD LN in Live Tagging to auto-fill field positions.
    </div>
  );

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 12px" }}>
        Which personnel packages does the offense deploy by field position? Helps predict substitution patterns.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th style={th}>Personnel</th>
              <th style={th}>Total</th>
              {orderedFP.map(fp => (
                <th key={fp} style={{ ...th, textAlign: "center" }}>{FP_SHORT[fp]||fp}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.pers} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ ...td, fontWeight: 700, color: ACCENT }}>{row.pers}</td>
                <td style={{ ...td, color: "var(--text3)" }}>{row.total}</td>
                {orderedFP.map(fp => {
                  const count = row.byFP[fp] || 0;
                  const p = pct(count, row.total);
                  return (
                    <td key={fp} style={{ ...td, textAlign: "center" }}>
                      {count > 0 ? (
                        <div>
                          <div style={{
                            width: `${Math.max(8, p)}%`, height: 4,
                            background: GREEN, borderRadius: 2,
                            margin: "0 auto 2px",
                          }} />
                          <span style={{ color: "var(--text2)", fontSize: 11 }}>{count}×</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text3)", fontSize: 10 }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 4 — Red Zone Play Caller
// HIGH RZ (1-10) vs LOW RZ (11-20): run/pass split, formations, play calls.
// Inspired by: ESPN Analytics, Hudl Red Zone Reports
// ─────────────────────────────────────────────────────────────────────────────
const RZ_ZONES = [
  { key: "HIGH REDZONE", label: "High Red Zone", sub: "1–10 yd line", color: "#C0392B" },
  { key: "LOW REDZONE",  label: "Low Red Zone",  sub: "11–20 yd line", color: "#E67E22" },
];

function topN(arr, field, n = 5) {
  const counts = {};
  arr.forEach(r => {
    const v = String(r[field] || "").trim();
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function MiniBar({ runPct, passPct, rpoPct }) {
  return (
    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1, margin: "6px 0" }}>
      <div style={{ flex: runPct,  background: RUN_COLOR,  minWidth: runPct  > 0 ? 3 : 0 }} />
      {rpoPct > 0 && <div style={{ flex: rpoPct, background: RPO_COLOR, minWidth: 3 }} />}
      <div style={{ flex: passPct, background: PASS_COLOR, minWidth: passPct > 0 ? 3 : 0 }} />
    </div>
  );
}

function RedZonePlayCaller({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");
  const [activeZone, setActiveZone] = useState("HIGH REDZONE");

  const zoneData = useMemo(() => {
    return RZ_ZONES.map(zone => {
      const zRows = offense.filter(r => String(r["FP GROUP"] || "").trim() === zone.key);
      const run   = zRows.filter(r => playTypePTC(r) === "run").length;
      const pass  = zRows.filter(r => playTypePTC(r) === "pass").length;
      const rpo   = zRows.filter(r => playTypePTC(r) === "rpo").length;
      const total = zRows.length;
      const topForms   = topN(zRows, "OFF FORM");
      const topPlays   = topN(zRows, "OFF PLAY");
      const topBackf   = topN(zRows, "BACKFIELD", 3);
      const topPers    = topN(zRows, "PERSONNEL", 3);
      // Down distribution inside RZ
      const dnCounts = { "1st": 0, "2nd": 0, "3rd": 0, "4th": 0 };
      zRows.forEach(r => {
        const dn = String(r["DN"] || "").trim();
        if (dn.startsWith("1")) dnCounts["1st"]++;
        else if (dn.startsWith("2")) dnCounts["2nd"]++;
        else if (dn.startsWith("3")) dnCounts["3rd"]++;
        else if (dn.startsWith("4")) dnCounts["4th"]++;
      });
      return {
        ...zone, total, run, pass, rpo,
        runPct: pct(run, total), passPct: pct(pass, total), rpoPct: pct(rpo, total),
        topForms, topPlays, topBackf, topPers, dnCounts,
      };
    });
  }, [offense]);

  if (!offense.length) return <NoData />;

  const noRZData = zoneData.every(z => z.total === 0);
  if (noRZData) return (
    <div style={{ color: "var(--text3)", fontSize: 12, padding: "16px 0" }}>
      No Red Zone plays yet — FP GROUP "HIGH REDZONE" or "LOW REDZONE" not found.
      Enter YARD LN in Live Tagging to auto-fill field positions.
    </div>
  );

  const active = zoneData.find(z => z.key === activeZone);

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 14px" }}>
        What does the offense do inside the 20? Compare High vs Low Red Zone tendencies —
        formations, play calls, run/pass split, and personnel.
      </p>

      {/* Zone selector + summary bars */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {zoneData.map(zone => (
          <div
            key={zone.key}
            onClick={() => zone.total > 0 && setActiveZone(zone.key)}
            style={{
              flex: 1, minWidth: 180,
              background: activeZone === zone.key ? "var(--surface2)" : "var(--bg)",
              border: `2px solid ${activeZone === zone.key ? zone.color : "var(--border)"}`,
              borderRadius: 10, padding: "12px 16px",
              cursor: zone.total > 0 ? "pointer" : "default",
              opacity: zone.total === 0 ? 0.45 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
              <span style={{ color: zone.color, fontSize: 13, fontWeight: 700 }}>{zone.label}</span>
              <span style={{ color: "var(--text3)", fontSize: 10 }}>{zone.sub}</span>
            </div>
            <div style={{ color: "var(--text3)", fontSize: 11, marginBottom: 6 }}>
              {zone.total} plays
            </div>
            <MiniBar runPct={zone.runPct} passPct={zone.passPct} rpoPct={zone.rpoPct} />
            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
              <span style={{ color: RUN_COLOR,  fontWeight: 700 }}>Run {zone.runPct}%</span>
              {zone.rpoPct > 0 && <span style={{ color: RPO_COLOR, fontWeight: 700 }}>RPO {zone.rpoPct}%</span>}
              <span style={{ color: PASS_COLOR, fontWeight: 700 }}>Pass {zone.passPct}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel for active zone */}
      {active && active.total > 0 && (
        <div style={{
          background: "var(--bg)", borderRadius: 10,
          border: `1px solid ${active.color}44`, padding: "16px 18px",
        }}>
          <div style={{
            color: active.color, fontSize: 12, fontWeight: 700,
            marginBottom: 14, letterSpacing: .5,
          }}>
            {active.label.toUpperCase()} BREAKDOWN
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>

            {/* Down distribution */}
            <div>
              <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
                DOWN DISTRIBUTION
              </div>
              {Object.entries(active.dnCounts).filter(([,v]) => v > 0).map(([dn, count]) => (
                <div key={dn} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ color: "var(--text2)", fontSize: 11, width: 28 }}>{dn}</span>
                  <div style={{
                    height: 6, borderRadius: 3,
                    width: `${pct(count, active.total)}%`,
                    background: active.color, minWidth: 4,
                  }} />
                  <span style={{ color: "var(--text3)", fontSize: 10 }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Top formations */}
            {active.topForms.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
                  TOP FORMATIONS
                </div>
                {active.topForms.map(([form, count]) => (
                  <div key={form} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{
                      background: "rgba(92,191,138,.12)", color: ACCENT,
                      fontSize: 10, padding: "2px 8px", borderRadius: 4, flex: 1,
                    }}>{form}</span>
                    <span style={{ color: "var(--text3)", fontSize: 10, minWidth: 20 }}>{count}×</span>
                    <span style={{ color: "var(--text3)", fontSize: 10, minWidth: 28 }}>
                      {pct(count, active.total)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Top play calls */}
            {active.topPlays.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
                  TOP PLAY CALLS
                </div>
                {active.topPlays.map(([play, count]) => (
                  <div key={play} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{
                      background: "var(--surface2)", color: "var(--text2)",
                      fontSize: 10, padding: "2px 8px", borderRadius: 4,
                      border: "1px solid var(--border)", flex: 1,
                    }}>{play}</span>
                    <span style={{ color: "var(--text3)", fontSize: 10, minWidth: 20 }}>{count}×</span>
                    <span style={{ color: "var(--text3)", fontSize: 10, minWidth: 28 }}>
                      {pct(count, active.total)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Personnel */}
            {active.topPers.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
                  PERSONNEL
                </div>
                {active.topPers.map(([pers, count]) => (
                  <div key={pers} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: "var(--text2)", fontSize: 11, flex: 1 }}>{pers}</span>
                    <span style={{ color: "var(--text3)", fontSize: 10 }}>{count}× ({pct(count, active.total)}%)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Backfield */}
            {active.topBackf.length > 0 && (
              <div>
                <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
                  BACKFIELD
                </div>
                {active.topBackf.map(([bf, count]) => (
                  <div key={bf} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: "var(--text2)", fontSize: 11, flex: 1 }}>{bf}</span>
                    <span style={{ color: "var(--text3)", fontSize: 10 }}>{count}× ({pct(count, active.total)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 5 — Drive Starter Tendencies
// What does the offense run on the FIRST PLAY of each drive?
// Inspired by: Sharp Football Analysis, Timo Riske / PFF
// ─────────────────────────────────────────────────────────────────────────────
function DriveStarterTendencies({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");

  const data = useMemo(() => {
    // Group by drive — first play per drive
    const driveMap = {};
    offense.forEach(r => {
      const drv = String(r["DRIVE"] || "").trim();
      if (!drv) return;
      if (!driveMap[drv]) driveMap[drv] = [];
      driveMap[drv].push(r);
    });
    // For each drive: sort by play # and take first
    const firstPlays = Object.values(driveMap).map(plays => {
      return plays.sort((a, b) => {
        const pa = parseInt(a["PLAY #"] || 0, 10);
        const pb = parseInt(b["PLAY #"] || 0, 10);
        return pa - pb;
      })[0];
    });

    const total = firstPlays.length;
    const run   = firstPlays.filter(r => playTypePTC(r) === "run").length;
    const pass  = firstPlays.filter(r => playTypePTC(r) === "pass").length;
    const rpo   = firstPlays.filter(r => playTypePTC(r) === "rpo").length;
    const topForms   = topN(firstPlays, "OFF FORM");
    const topPlays   = topN(firstPlays, "OFF PLAY");
    const topBackf   = topN(firstPlays, "BACKFIELD", 3);
    const topResults = topN(firstPlays, "RESULT",    4);

    return { total, run, pass, rpo, topForms, topPlays, topBackf, topResults };
  }, [offense]);

  if (!offense.length) return <NoData />;
  if (data.total === 0) return (
    <div style={{ color: "var(--text3)", fontSize: 12, padding: "12px 0" }}>
      No drive data — fill the DRIVE column in Live Tagging to enable this tool.
    </div>
  );

  const { total, run, pass, rpo, topForms, topPlays, topBackf, topResults } = data;
  const runPct = pct(run, total), passPct = pct(pass, total), rpoPct = pct(rpo, total);

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 14px" }}>
        What does the offense call on the <strong style={{ color: ACCENT }}>first play of each drive</strong>?
        Sets the tone — tells you whether they want to establish run or attack vertically off first snap.
      </p>
      <div style={{
        background: "var(--bg)", borderRadius: 10,
        border: "1px solid var(--border)", padding: "14px 16px", marginBottom: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13 }}>
            {total} Drive-Openers
          </span>
          <span style={{ color: RUN_COLOR,  fontWeight: 700, fontSize: 12 }}>Run {runPct}%</span>
          {rpoPct > 0 && <span style={{ color: RPO_COLOR, fontWeight: 700, fontSize: 12 }}>RPO {rpoPct}%</span>}
          <span style={{ color: PASS_COLOR, fontWeight: 700, fontSize: 12 }}>Pass {passPct}%</span>
        </div>
        <MiniBar runPct={runPct} passPct={passPct} rpoPct={rpoPct} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {[
          { label: "TOP FORMATIONS",   entries: topForms   },
          { label: "TOP PLAY CALLS",   entries: topPlays   },
          { label: "BACKFIELD",        entries: topBackf   },
          { label: "RESULTS",          entries: topResults },
        ].map(({ label, entries }) => entries.length > 0 && (
          <div key={label}>
            <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
              {label}
            </div>
            {entries.map(([val, count]) => (
              <div key={val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{
                  background: "var(--surface2)", color: "var(--text2)",
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  border: "1px solid var(--border)", flex: 1,
                }}>{val}</span>
                <span style={{ color: "var(--text3)", fontSize: 10 }}>
                  {count}× ({pct(count, total)}%)
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 6 — Motion & Shift Frequency
// How often does offense use motion? By down, formation, and play type.
// Inspired by: Sports Info Solutions, Warren Sharp Motion Reports
// ─────────────────────────────────────────────────────────────────────────────
function MotionShiftFrequency({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");

  const data = useMemo(() => {
    const withMotion    = offense.filter(r => String(r["MOTION"] || "").trim() !== "");
    const motionRate    = pct(withMotion.length, offense.length);

    // By down
    const byDown = ["1","2","3","4"].map(dn => {
      const dnRows = offense.filter(r => String(r["DN"] || "").trim().startsWith(dn));
      const dnMot  = dnRows.filter(r => String(r["MOTION"] || "").trim() !== "");
      return { dn: `${dn}st/nd/rd`, label: ["1st","2nd","3rd","4th"][+dn-1],
        total: dnRows.length, motion: dnMot.length,
        rate: pct(dnMot.length, dnRows.length) };
    }).filter(d => d.total > 0);

    // By formation (top 6)
    const formMot = {};
    offense.forEach(r => {
      const f = String(r["OFF FORM"] || "").trim(); if (!f) return;
      if (!formMot[f]) formMot[f] = { total: 0, motion: 0 };
      formMot[f].total++;
      if (String(r["MOTION"] || "").trim()) formMot[f].motion++;
    });
    const byForm = Object.entries(formMot)
      .sort((a, b) => b[1].total - a[1].total).slice(0, 6)
      .map(([form, d]) => ({ form, ...d, rate: pct(d.motion, d.total) }));

    // Motion types (what values appear in MOTION column)
    const motTypes = topN(withMotion, "MOTION", 6);

    // Motion by play type
    const motByPT = {};
    withMotion.forEach(r => {
      const pt = String(r["PLAY TYPE CALLED"] || r["PLAY TYPE"] || "").trim().toUpperCase() || "—";
      motByPT[pt] = (motByPT[pt] || 0) + 1;
    });

    return { total: offense.length, withMotion: withMotion.length, motionRate,
      byDown, byForm, motTypes, motByPT };
  }, [offense]);

  if (!offense.length) return <NoData />;
  if (data.withMotion === 0) return (
    <div style={{ color: "var(--text3)", fontSize: 12, padding: "12px 0" }}>
      No MOTION data — fill the MOTION column in Live Tagging to enable this tool.
    </div>
  );

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 14px" }}>
        How often does the offense go in motion before the snap? Motion signals play type —
        high motion rates on certain downs or formations is a tell for the DC.
      </p>

      {/* Overall rate */}
      <div style={{
        display: "flex", gap: 20, alignItems: "center",
        background: "var(--bg)", borderRadius: 10,
        border: "1px solid var(--border)", padding: "12px 16px", marginBottom: 16,
      }}>
        <div>
          <div style={{ color: "var(--text3)", fontSize: 10, marginBottom: 2 }}>OVERALL MOTION RATE</div>
          <div style={{ color: ACCENT, fontSize: 28, fontWeight: 900 }}>{data.motionRate}%</div>
          <div style={{ color: "var(--text3)", fontSize: 11 }}>
            {data.withMotion} of {data.total} plays
          </div>
        </div>
        {/* Motion by play type */}
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--text3)", fontSize: 10, marginBottom: 6, fontWeight: 700, letterSpacing: .5 }}>
            MOTION → PLAY TYPE
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(data.motByPT).map(([pt, count]) => (
              <span key={pt} style={{
                background: pt === "RUN" ? `rgba(var(--run-rgb),.15)` : pt === "PASS" ? `rgba(var(--pass-rgb),.15)` : "rgba(212,120,42,.15)",
                color: pt === "RUN" ? RUN_COLOR : pt === "PASS" ? PASS_COLOR : RPO_COLOR,
                fontSize: 11, padding: "3px 10px", borderRadius: 6, fontWeight: 700,
              }}>{pt}: {count}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* By down */}
        <div style={{ background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: .5 }}>
            MOTION RATE BY DOWN
          </div>
          {data.byDown.map(d => (
            <div key={d.label} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "var(--text2)", fontSize: 12 }}>{d.label}</span>
                <span style={{ color: ACCENT, fontWeight: 700, fontSize: 12 }}>{d.rate}%</span>
              </div>
              <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.rate}%`, background: ACCENT, borderRadius: 3, minWidth: d.rate > 0 ? 4 : 0 }} />
              </div>
              <div style={{ color: "var(--text3)", fontSize: 10, marginTop: 1 }}>{d.motion}/{d.total} plays</div>
            </div>
          ))}
        </div>

        {/* By formation */}
        <div style={{ background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)", padding: "12px 14px" }}>
          <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: .5 }}>
            MOTION RATE BY FORMATION
          </div>
          {data.byForm.map(f => (
            <div key={f.form} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: ACCENT, fontSize: 11 }}>{f.form}</span>
                <span style={{ color: "var(--text2)", fontWeight: 700, fontSize: 12 }}>{f.rate}%</span>
              </div>
              <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${f.rate}%`, background: GREEN, borderRadius: 3, minWidth: f.rate > 0 ? 4 : 0 }} />
              </div>
              <div style={{ color: "var(--text3)", fontSize: 10, marginTop: 1 }}>{f.motion}/{f.total} plays</div>
            </div>
          ))}
        </div>
      </div>

      {/* Motion type chips */}
      {data.motTypes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ color: "var(--text3)", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: .5 }}>
            MOTION TYPES USED
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.motTypes.map(([mot, count]) => (
              <span key={mot} style={{
                background: "var(--surface2)", color: "var(--text2)",
                fontSize: 11, padding: "4px 12px", borderRadius: 6,
                border: "1px solid var(--border)",
              }}>{mot} <strong style={{ color: ACCENT }}>{count}×</strong></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 7 — Route Concept Heat Map
// Which route concepts appear in which situations (down, field position)?
// Inspired by: Pro Football Focus Route Chart, McVay-era passing concepts
// ─────────────────────────────────────────────────────────────────────────────
function RouteConceptHeat({ rows }) {
  const passes = rows.filter(r =>
    r["ODK"] === "O" && playTypePTC(r) === "pass"
  );

  const data = useMemo(() => {
    // Top route concepts
    const conceptMap = {};
    passes.forEach(r => {
      const c = String(r["ROUTE CONCEPT"] || "").trim(); if (!c) return;
      if (!conceptMap[c]) conceptMap[c] = { total: 0, byDown: {}, byFP: {}, byDist: {} };
      conceptMap[c].total++;
      // Down
      const dn = String(r["DN"] || "").trim()[0];
      if (dn && "1234".includes(dn)) conceptMap[c].byDown[dn] = (conceptMap[c].byDown[dn]||0)+1;
      // FP
      const fp = String(r["FP GROUP"] || "").trim();
      if (fp) conceptMap[c].byFP[fp] = (conceptMap[c].byFP[fp]||0)+1;
    });
    return Object.entries(conceptMap)
      .sort((a,b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([concept, d]) => ({ concept, ...d }));
  }, [passes]);

  if (!passes.length) return <NoData />;
  if (!data.length) return (
    <div style={{ color: "var(--text3)", fontSize: 12, padding: "12px 0" }}>
      No ROUTE CONCEPT data — fill the ROUTE CONCEPT column in Live Tagging.
    </div>
  );

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 14px" }}>
        Top route concepts on passing plays. Which concepts do they lean on by down and field position?
        Tells your secondary what to expect in each situation.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map(d => {
          const downOrder = ["1","2","3","4"];
          return (
            <div key={d.concept} style={{
              background: "var(--bg)", borderRadius: 8,
              border: "1px solid var(--border)", padding: "10px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 13, flex: 1 }}>
                  {d.concept}
                </span>
                <span style={{
                  background: `rgba(var(--pass-rgb),.15)`,
                  color: PASS_COLOR, fontSize: 11, padding: "2px 8px",
                  borderRadius: 6, fontWeight: 700,
                }}>{d.total}×</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {/* Down badges */}
                {downOrder.filter(dn => d.byDown[dn]).map(dn => (
                  <span key={dn} style={{
                    background: "var(--surface2)", color: "var(--text2)",
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    border: "1px solid var(--border)",
                  }}>
                    {["1st","2nd","3rd","4th"][+dn-1]}: {d.byDown[dn]}×
                  </span>
                ))}
                {/* FP badges */}
                {Object.entries(d.byFP).slice(0,3).map(([fp, count]) => (
                  <span key={fp} style={{
                    background: "rgba(92,191,138,.1)", color: ACCENT,
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  }}>
                    {FP_SHORT[fp]||fp}: {count}×
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 8 — Backfield Tendency by Down
// Which backfield packages does the offense use per down?
// Run/Pass/RPO split per backfield group. Inspired by PFF Personnel Usage.
// ─────────────────────────────────────────────────────────────────────────────
const BF_DOWN_LABELS = ["1st","2nd","3rd","4th"];

function BackfieldTendencyByDown({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");
  const [selDown, setSelDown] = useState("1st");

  const data = useMemo(() => {
    const dnNum = ["1st","2nd","3rd","4th"].indexOf(selDown) + 1;
    const filtered = offense.filter(r => String(r["DN"] || "").trim().startsWith(String(dnNum)));

    if (!filtered.length) return [];

    const bfMap = {};
    filtered.forEach(r => {
      const bf = String(r["BACKFIELD"] || "").trim() || "—";
      if (!bfMap[bf]) bfMap[bf] = { total: 0, run: 0, pass: 0, rpo: 0, forms: {} };
      bfMap[bf].total++;
      const pt = playTypePTC(r);
      if (pt === "run")  bfMap[bf].run++;
      else if (pt === "pass") bfMap[bf].pass++;
      else if (pt === "rpo")  bfMap[bf].rpo++;
      const form = String(r["OFF FORM"] || "").trim();
      if (form) bfMap[bf].forms[form] = (bfMap[bf].forms[form] || 0) + 1;
    });

    const downTotal = filtered.length;
    return Object.entries(bfMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([bf, d]) => {
        const topForms = Object.entries(d.forms)
          .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f]) => f);
        return {
          bf,
          total: d.total,
          sharePct: pct(d.total, downTotal),
          runPct:  pct(d.run,  d.total),
          passPct: pct(d.pass, d.total),
          rpoPct:  pct(d.rpo,  d.total),
          topForms,
        };
      });
  }, [offense, selDown]);

  const hasRPO = data.some(d => d.rpoPct > 0);

  if (!offense.length) return <NoData />;

  const dnNum = ["1st","2nd","3rd","4th"].indexOf(selDown) + 1;
  const filtered = offense.filter(r => String(r["DN"] || "").trim().startsWith(String(dnNum)));
  const noBFData = filtered.every(r => !String(r["BACKFIELD"] || "").trim());

  return (
    <div>
      <p style={{ color: "var(--text3)", fontSize: 11, margin: "0 0 12px" }}>
        Which backfield sets does the offense use by down? Run/Pass split per package — tells you
        which backfields signal run vs. pass so you can adjust your front pre-snap.
      </p>

      {/* Down tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {BF_DOWN_LABELS.map(d => (
          <button key={d} onClick={() => setSelDown(d)}
            style={{
              background: selDown === d ? GREEN : "var(--surface2)",
              color: selDown === d ? "#fff" : "var(--text3)",
              border: "none", borderRadius: 6, padding: "5px 14px",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
            {d}
          </button>
        ))}
      </div>

      {!data.length ? (
        <div style={{ color: "var(--text3)", fontSize: 12 }}>No {selDown} down plays.</div>
      ) : noBFData ? (
        <div style={{ color: "var(--text3)", fontSize: 12 }}>
          No BACKFIELD data on {selDown} down — fill the BACKFIELD column in Live Tagging.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map(d => (
            <div key={d.bf} style={{
              background: "var(--bg)", borderRadius: 10,
              border: "1px solid var(--border)", padding: "12px 16px",
            }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{
                  color: ACCENT, fontSize: 13, fontWeight: 700,
                  minWidth: 110,
                }}>{d.bf}</span>
                <span style={{
                  background: "var(--surface2)", color: "var(--text3)",
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                }}>{d.total} plays · {d.sharePct}% of {selDown}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: RUN_COLOR,  fontWeight: 700 }}>Run {d.runPct}%</span>
                  {hasRPO && d.rpoPct > 0 && (
                    <span style={{ color: RPO_COLOR, fontWeight: 700 }}>RPO {d.rpoPct}%</span>
                  )}
                  <span style={{ color: PASS_COLOR, fontWeight: 700 }}>Pass {d.passPct}%</span>
                </div>
              </div>

              {/* Stacked bar */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1, marginBottom: 8 }}>
                <div style={{ flex: d.runPct,  background: RUN_COLOR,  minWidth: d.runPct  > 0 ? 3 : 0 }} />
                {d.rpoPct > 0 && <div style={{ flex: d.rpoPct, background: RPO_COLOR, minWidth: 3 }} />}
                <div style={{ flex: d.passPct, background: PASS_COLOR, minWidth: d.passPct > 0 ? 3 : 0 }} />
              </div>

              {/* Top formations */}
              {d.topForms.length > 0 && (
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ color: "var(--text3)", fontSize: 10 }}>Top formations:</span>
                  {d.topForms.map(f => (
                    <span key={f} style={{
                      background: "rgba(92,191,138,.1)", color: ACCENT,
                      fontSize: 10, padding: "2px 7px", borderRadius: 4,
                    }}>{f}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoAnalytics() {
  const { user } = useAuth();
  const { selectedGame, playRows, liveRows, mode } = useApp();
  const rows = mode === "live" ? liveRows : playRows;

  if (user?.role !== "Admin")
    return <div style={{ padding: 32, color: "var(--text3)" }}>Admin only.</div>;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "var(--text)", margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
          📊 Auto Analytics Lab
        </h2>
        <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>
          Advanced tools for the Defensive Coordinator — auto-built, admin-reviewed.
          {selectedGame
            ? <> Analyzing: <strong style={{ color: ACCENT }}>W{selectedGame.week} — {selectedGame.opponent}</strong> ({mode} mode)</>
            : <> Select a game from the sidebar.</>}
        </p>
      </div>

      <ToolCard
        title="3rd Down Tendency Matrix"
        source="PFF · Next Gen Stats"
        description="What does the offense run on 3rd down? Broken down by distance, top formations and play concepts. Most valuable tool for a DC before calling a 3rd down defense."
      >
        <ThirdDownMatrix rows={rows} />
      </ToolCard>

      <ToolCard
        title="Situational Tendency Table"
        source="Hudl IQ"
        description="Down × Distance × Field Position matrix. Select a down to see run/pass split and field position breakdown for each distance bucket."
      >
        <SituationalMatrix rows={rows} />
      </ToolCard>

      <ToolCard
        title="Personnel by Field Position"
        source="NFL Next Gen Stats"
        description="Which personnel packages does the offense use at each zone of the field? Helps predict substitutions and package tendencies."
      >
        <PersonnelByFieldPosition rows={rows} />
      </ToolCard>

      <ToolCard
        title="Red Zone Play Caller"
        source="ESPN Analytics · Hudl"
        description="High RZ (1–10) vs Low RZ (11–20): run/pass split, top formations, play calls, personnel and backfield. Click a zone to drill down."
      >
        <RedZonePlayCaller rows={rows} />
      </ToolCard>

      <ToolCard
        title="Drive Starter Tendencies"
        source="PFF · Sharp Football"
        description="First play of every drive: does the offense want to establish run or throw immediately? Formation and play-call frequency on drive-openers."
      >
        <DriveStarterTendencies rows={rows} />
      </ToolCard>

      <ToolCard
        title="Motion & Shift Frequency"
        source="Sports Info Solutions · Warren Sharp"
        description="How often does the offense go in motion? Rate by down, by formation, motion types used, and what play type follows the motion."
      >
        <MotionShiftFrequency rows={rows} />
      </ToolCard>

      <ToolCard
        title="Route Concept Heat"
        source="PFF Route Charts · McVay Offense"
        description="Top route concepts on passing plays, broken down by down and field position. Tells your secondary what to expect in each situation."
      >
        <RouteConceptHeat rows={rows} />
      </ToolCard>

      <ToolCard
        title="Backfield Tendency by Down"
        source="PFF Personnel Usage"
        description="Which backfield packages does the offense deploy on each down? Run/Pass/RPO split per backfield group — pre-snap tip for adjusting your front seven."
      >
        <BackfieldTendencyByDown rows={rows} />
      </ToolCard>

      <ToolCard
        title="Formation → Play Call Report"
        source="Hudl IQ · PFF"
        description="For each offensive formation: run/pass split and the top play calls with frequency bars. Pre-snap cheat sheet for your DC — know what's coming before the snap."
      >
        <FormationPlayCallReport rows={rows} />
      </ToolCard>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool 9 — Formation → Play Call Report
// For each OFF FORM: run/pass split + top play calls (OFF PLAY) ranked by freq.
// ─────────────────────────────────────────────────────────────────────────────
const FPC_DOWN_LABELS = ["All","1st","2nd","3rd","4th"];

function FormationPlayCallReport({ rows }) {
  const offense = rows.filter(r => r["ODK"] === "O");
  const [selDown, setSelDown]   = useState("All");
  const [expanded, setExpanded] = useState(null); // formation key

  const data = useMemo(() => {
    let filtered = offense;
    if (selDown !== "All") {
      const dnNum = FPC_DOWN_LABELS.indexOf(selDown);
      filtered = offense.filter(r => String(r["DN"] || "").trim().startsWith(String(dnNum)));
    }

    const formMap = {};
    filtered.forEach(r => {
      const form = String(r["OFF FORM"] || "").trim() || "—";
      if (!formMap[form]) formMap[form] = { total: 0, run: 0, pass: 0, rpo: 0, plays: {} };
      formMap[form].total++;
      const pt = playTypePTC(r);
      if (pt === "run")  formMap[form].run++;
      else if (pt === "pass") formMap[form].pass++;
      else if (pt === "rpo")  formMap[form].rpo++;
      const play = String(r["OFF PLAY"] || "").trim();
      if (play) formMap[form].plays[play] = (formMap[form].plays[play] || 0) + 1;
    });

    return Object.entries(formMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([form, d]) => {
        const topPlays = Object.entries(d.plays)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([play, n]) => ({ play, n, pct: pct(n, d.total) }));
        return {
          form,
          total: d.total,
          runPct:  pct(d.run,  d.total),
          passPct: pct(d.pass, d.total),
          rpoPct:  pct(d.rpo,  d.total),
          topPlays,
        };
      });
  }, [offense, selDown]);

  if (!offense.length) return <NoData />;

  const hasAnyRPO = data.some(d => d.rpoPct > 0);

  return (
    <div>
      {/* Down filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {FPC_DOWN_LABELS.map(d => (
          <button key={d} onClick={() => setSelDown(d)} style={{
            background: selDown === d ? GREEN : "var(--surface2)",
            color: selDown === d ? "#fff" : "var(--text3)",
            border: "none", borderRadius: 6, padding: "5px 14px",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>{d}</button>
        ))}
      </div>

      {!data.length
        ? <div style={{ color: "var(--text3)", fontSize: 12 }}>No data for {selDown} down.</div>
        : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th style={th}>Formation</th>
                <th style={{ ...th, textAlign: "right" }}>n</th>
                <th style={{ ...th, textAlign: "right", color: RUN_COLOR }}>Run%</th>
                <th style={{ ...th, textAlign: "right", color: PASS_COLOR }}>Pass%</th>
                {hasAnyRPO && <th style={{ ...th, textAlign: "right", color: RPO_COLOR }}>RPO%</th>}
                <th style={th}>Top Play Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.form}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: expanded === row.form ? "var(--surface2)" : "transparent",
                  }}
                  onClick={() => setExpanded(expanded === row.form ? null : row.form)}
                >
                  <td style={{ ...td, fontWeight: 700, color: "var(--text)", maxWidth: 160,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.form}
                  </td>
                  <td style={{ ...td, textAlign: "right", color: "var(--text3)" }}>{row.total}</td>
                  <td style={{ ...td, textAlign: "right",
                    color: row.runPct  >= 65 ? RUN_COLOR  : "var(--text2)",
                    fontWeight: row.runPct  >= 65 ? 700 : 400 }}>{row.runPct}%</td>
                  <td style={{ ...td, textAlign: "right",
                    color: row.passPct >= 65 ? PASS_COLOR : "var(--text2)",
                    fontWeight: row.passPct >= 65 ? 700 : 400 }}>{row.passPct}%</td>
                  {hasAnyRPO && (
                    <td style={{ ...td, textAlign: "right",
                      color: row.rpoPct >= 65 ? RPO_COLOR : "var(--text2)",
                      fontWeight: row.rpoPct >= 65 ? 700 : 400 }}>{row.rpoPct}%</td>
                  )}
                  <td style={{ ...td, minWidth: 200 }}>
                    {/* Inline mini bars for top 3 plays */}
                    {expanded === row.form ? (
                      /* Expanded: full play list with bar */
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {row.topPlays.map(p => (
                          <div key={p.play} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{
                              height: 14, width: `${Math.max(p.pct, 4)}%`,
                              background: ACCENT, borderRadius: 3, opacity: 0.8,
                              minWidth: 4, flexShrink: 0,
                            }} />
                            <span style={{ color: "var(--text2)", fontSize: 11, whiteSpace: "nowrap" }}>
                              {p.play}
                            </span>
                            <span style={{ color: "var(--text3)", fontSize: 10, marginLeft: "auto", paddingLeft: 6 }}>
                              {p.pct}% ({p.n})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Collapsed: top 3 as pill chips */
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {row.topPlays.slice(0, 3).map(p => (
                          <span key={p.play} style={{
                            background: "var(--bg)", color: "var(--text2)",
                            fontSize: 10, padding: "2px 7px", borderRadius: 8,
                            border: "1px solid var(--border)", whiteSpace: "nowrap",
                          }}>
                            {p.play} <span style={{ color: ACCENT, fontWeight: 700 }}>{p.pct}%</span>
                          </span>
                        ))}
                        {row.topPlays.length > 3 && (
                          <span style={{ color: "var(--text3)", fontSize: 10, alignSelf: "center" }}>
                            +{row.topPlays.length - 3} more ▼
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );
}

const th = {
  padding: "7px 10px", textAlign: "left", color: "var(--text3)",
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: .6,
};
const td = { padding: "8px 10px", color: "var(--text2)" };
