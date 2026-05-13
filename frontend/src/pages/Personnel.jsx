import { useState, useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { computePersonnelData, computeFormationStats, filterAnalyticsRows } from "../lib/dataEngine";

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "var(--rpo-color)";

function norm(v) { return String(v ?? "").trim(); }

function StackBar({ run, pass, rpo, height = 8 }) {
  const total = run + pass + rpo;
  if (!total) return null;
  const rPct   = Math.round(run  / total * 100);
  const psPct  = Math.round(pass / total * 100);
  const rpoPct = 100 - rPct - psPct;
  return (
    <div style={{ display: "flex", height, borderRadius: 4, overflow: "hidden", background: "var(--border)" }}>
      {rPct   > 0 && <div style={{ width: `${rPct}%`,   background: RUN_COLOR  }} />}
      {rpoPct > 0 && <div style={{ width: `${rpoPct}%`, background: RPO_COLOR  }} />}
      {psPct  > 0 && <div style={{ width: `${psPct}%`,  background: PASS_COLOR }} />}
    </div>
  );
}

export default function Personnel() {
  const { selectedGame, mode, playRows, liveRows } = useApp();
  const rows = mode === "live" ? liveRows : playRows;
  const [selP, setSelP] = useState(null);

  const data    = useMemo(() => computePersonnelData(rows), [rows]);
  const total   = data.reduce((s, d) => s + d.total, 0);

  // Filtered rows for selected personnel → formation drilldown
  const filteredRows = useMemo(() => {
    if (!selP) return [];
    return filterAnalyticsRows(rows).filter(r => norm(r["PERSONNEL"]) === selP);
  }, [rows, selP]);

  const formations = useMemo(() => {
    if (!selP) return [];
    return computeFormationStats(filteredRows);
  }, [filteredRows, selP]);

  if (!selectedGame) return (
    <div style={{ padding: 24, color: "var(--text3)" }}>Kein Spiel ausgewählt.</div>
  );
  if (!rows.length) return (
    <div style={{ padding: 24, color: "var(--text3)" }}>Keine Plays vorhanden.</div>
  );

  const selectedEntry = data.find(d => d.pers === selP);

  return (
    <div style={{ padding: 16, maxWidth: 920 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
        <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 700 }}>Personnel Analysis</span>
        <span style={{ color: "var(--text3)", fontSize: 12 }}>{total} Plays</span>
      </div>

      {/* Personnel-Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setSelP(null)}
          style={{
            padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: "pointer", border: "1px solid var(--border)",
            background: selP === null ? "var(--accent)" : "var(--surface2)",
            color: selP === null ? "#fff" : "var(--text)",
          }}
        >Alle</button>
        {data.map(d => {
          const active = selP === d.pers;
          return (
            <button
              key={d.pers}
              onClick={() => setSelP(active ? null : d.pers)}
              style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid var(--border)",
                background: active ? "var(--accent)" : "var(--surface2)",
                color: active ? "#fff" : "var(--text)",
              }}
            >
              {d.pers}
              <span style={{ marginLeft: 6, opacity: 0.7, fontWeight: 400 }}>{d.total}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 11 }}>
        {[["Run", RUN_COLOR], ["RPO", RPO_COLOR], ["Pass", PASS_COLOR]].map(([l, c]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text3)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />
            {l}
          </span>
        ))}
      </div>

      {/* ── Personnel table (shown when no selection or always) ── */}
      {!selP && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "110px 60px 1fr 64px 64px 64px",
            gap: 8, padding: "9px 16px",
            background: "var(--surface2)", borderBottom: "1px solid var(--border)",
            fontSize: 11, color: "var(--text3)", fontWeight: 600,
          }}>
            <span>PERSONNEL</span>
            <span style={{ textAlign: "right" }}>PLAYS</span>
            <span style={{ paddingLeft: 4 }}>SPLIT</span>
            <span style={{ textAlign: "right" }}>RUN%</span>
            <span style={{ textAlign: "right" }}>RPO%</span>
            <span style={{ textAlign: "right" }}>PASS%</span>
          </div>

          {data.map((d, i) => {
            const sharePct = total ? Math.round(d.total / total * 100) : 0;
            return (
              <div key={d.pers}
                onClick={() => setSelP(d.pers)}
                style={{
                  display: "grid", gridTemplateColumns: "110px 60px 1fr 64px 64px 64px",
                  gap: 8, padding: "10px 16px", cursor: "pointer",
                  background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                  borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none",
                  alignItems: "center",
                  transition: "background .12s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(92,191,138,.07)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--surface)" : "var(--surface2)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "var(--text)",
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "2px 8px",
                  }}>{d.pers}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{d.total}</span>
                  <span style={{ fontSize: 10, color: "var(--text3)", display: "block" }}>{sharePct}%</span>
                </div>
                <div style={{ paddingLeft: 4 }}>
                  <StackBar run={d.run} pass={d.pass} rpo={d.rpo} />
                </div>
                <div style={{ textAlign: "right", fontSize: 13, color: RUN_COLOR, fontWeight: 600 }}>{d.runPct}%</div>
                <div style={{ textAlign: "right", fontSize: 13, color: RPO_COLOR, fontWeight: 600 }}>{d.rpoPct}%</div>
                <div style={{ textAlign: "right", fontSize: 13, color: PASS_COLOR, fontWeight: 600 }}>{d.passPct}%</div>
              </div>
            );
          })}

          {/* Summary row */}
          {(() => {
            const totRun  = data.reduce((s, d) => s + d.run,  0);
            const totPass = data.reduce((s, d) => s + d.pass, 0);
            const totRpo  = data.reduce((s, d) => s + d.rpo,  0);
            const totAll  = totRun + totPass + totRpo;
            const rPct   = totAll ? Math.round(totRun  / totAll * 100) : 0;
            const psPct  = totAll ? Math.round(totPass / totAll * 100) : 0;
            const rpoPct = 100 - rPct - psPct;
            return (
              <div style={{
                display: "grid", gridTemplateColumns: "110px 60px 1fr 64px 64px 64px",
                gap: 8, padding: "9px 16px",
                background: "var(--surface2)", borderTop: "2px solid var(--border)",
                fontSize: 11, fontWeight: 700, color: "var(--text3)", alignItems: "center",
              }}>
                <span>GESAMT</span>
                <span style={{ textAlign: "right", color: "var(--text)", fontSize: 13 }}>{total}</span>
                <div style={{ paddingLeft: 4 }}><StackBar run={totRun} pass={totPass} rpo={totRpo} /></div>
                <span style={{ textAlign: "right", color: RUN_COLOR,  fontSize: 13 }}>{rPct}%</span>
                <span style={{ textAlign: "right", color: RPO_COLOR,  fontSize: 13 }}>{rpoPct}%</span>
                <span style={{ textAlign: "right", color: PASS_COLOR, fontSize: 13 }}>{psPct}%</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Drilldown für ausgewählte Personnel-Gruppe ── */}
      {selP && selectedEntry && (
        <div>
          {/* Summary card */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "14px 18px", marginBottom: 16,
            display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>PERSONNEL</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{selP}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>PLAYS</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                {selectedEntry.total}
                <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400, marginLeft: 6 }}>
                  ({total ? Math.round(selectedEntry.total / total * 100) : 0}%)
                </span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>RUN / RPO / PASS</div>
              <StackBar run={selectedEntry.run} pass={selectedEntry.pass} rpo={selectedEntry.rpo} height={12} />
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12 }}>
                <span style={{ color: RUN_COLOR,  fontWeight: 700 }}>{selectedEntry.runPct}% Run</span>
                <span style={{ color: RPO_COLOR,  fontWeight: 700 }}>{selectedEntry.rpoPct}% RPO</span>
                <span style={{ color: PASS_COLOR, fontWeight: 700 }}>{selectedEntry.passPct}% Pass</span>
              </div>
            </div>
          </div>

          {/* Formation breakdown */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
            Formations aus {selP}
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 60px 1fr 64px 64px 64px",
              gap: 8, padding: "9px 16px",
              background: "var(--surface2)", borderBottom: "1px solid var(--border)",
              fontSize: 11, color: "var(--text3)", fontWeight: 600,
            }}>
              <span>FORMATION</span>
              <span style={{ textAlign: "right" }}>PLAYS</span>
              <span style={{ paddingLeft: 4 }}>SPLIT</span>
              <span style={{ textAlign: "right" }}>RUN%</span>
              <span style={{ textAlign: "right" }}>RPO%</span>
              <span style={{ textAlign: "right" }}>PASS%</span>
            </div>

            {formations.length === 0 ? (
              <div style={{ padding: "16px", color: "var(--text3)", fontSize: 13 }}>Keine Formations gefunden.</div>
            ) : formations.map((f, i) => (
              <div key={f.form} style={{
                display: "grid", gridTemplateColumns: "1fr 60px 1fr 64px 64px 64px",
                gap: 8, padding: "9px 16px",
                background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
                borderBottom: i < formations.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.form}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{f.total}</span>
                  <span style={{ fontSize: 10, color: "var(--text3)", display: "block" }}>
                    {filteredRows.length ? Math.round(f.total / filteredRows.length * 100) : 0}%
                  </span>
                </div>
                <div style={{ paddingLeft: 4 }}><StackBar run={f.run} pass={f.pass} rpo={f.rpo} /></div>
                <div style={{ textAlign: "right", fontSize: 13, color: RUN_COLOR,  fontWeight: 600 }}>{f.runPct}%</div>
                <div style={{ textAlign: "right", fontSize: 13, color: RPO_COLOR,  fontWeight: 600 }}>{f.rpoPct}%</div>
                <div style={{ textAlign: "right", fontSize: 13, color: PASS_COLOR, fontWeight: 600 }}>{f.passPct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
