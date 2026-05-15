import { useState, useMemo, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { apiGetImages } from "../lib/api";
import { filterAnalyticsRows, rowDownGroup, DOWN_GROUP_ORDER } from "../lib/dataEngine";

const GREEN      = "#154734";
const ACCENT     = "#5CBF8A";
const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "var(--rpo-color)";

function norm(v)    { return String(v ?? "").trim(); }
function normLow(v) { return norm(v).toLowerCase(); }
function playTypePTC(r) {
  const pt = normLow(r["PLAY TYPE CALLED"]);
  if (pt === "run") return "run"; if (pt === "pass") return "pass"; if (pt === "rpo") return "rpo";
  return null;
}
function normKey(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}
function findImage(label, images) {
  if (!label || !images) return null;
  const key = normKey(label);
  if (images[key]) return images[key];
  const found = Object.entries(images).find(([k]) => k.includes(key) || key.includes(k));
  return found ? found[1] : null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function calcStats(plays) {
  const total = plays.length;
  const run   = plays.filter(r => playTypePTC(r) === "run").length;
  const pass  = plays.filter(r => playTypePTC(r) === "pass").length;
  const rpo   = plays.filter(r => playTypePTC(r) === "rpo").length;
  const rPct  = total ? Math.round(run  / total * 100) : 0;
  const psPct = total ? Math.round(pass / total * 100) : 0;
  const rpoPct = total ? 100 - rPct - psPct : 0;
  return { total, run, pass, rpo, rPct, psPct, rpoPct };
}

function filterPlays(allRows, form, bf) {
  return allRows.filter(r => {
    if (norm(r["OFF FORM"]) !== form) return false;
    if (bf !== null) {
      const rbf = norm(r["BACKFIELD"]) || "—";
      if (rbf !== bf) return false;
    }
    return true;
  });
}

// ── StackBar ─────────────────────────────────────────────────────────────────
function StackBar({ run, pass, rpo, height = 7 }) {
  const total = run + pass + rpo;
  if (!total) return <div style={{ height, background: "var(--border)", borderRadius: 4 }} />;
  const rPct   = Math.round(run  / total * 100);
  const psPct  = Math.round(pass / total * 100);
  const rpoPct = 100 - rPct - psPct;
  return (
    <div style={{ display: "flex", height, borderRadius: 4, overflow: "hidden" }}>
      {rPct   > 0 && <div style={{ width: `${rPct}%`,   background: RUN_COLOR  }} />}
      {rpoPct > 0 && <div style={{ width: `${rpoPct}%`, background: RPO_COLOR  }} />}
      {psPct  > 0 && <div style={{ width: `${psPct}%`,  background: PASS_COLOR }} />}
    </div>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, sub, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      cursor: "pointer", border: `1px solid ${active ? ACCENT : "var(--border)"}`,
      background: active ? GREEN : "var(--surface2)",
      color: active ? "#fff" : "var(--text)",
      display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    }}>
      {label}
      {sub !== undefined && <span style={{ opacity: .6, fontWeight: 400, fontSize: 11 }}>{sub}</span>}
    </button>
  );
}

// ── Compact D&D table for a card ─────────────────────────────────────────────
function DnDMini({ plays }) {
  const rows = useMemo(() => {
    return DOWN_GROUP_ORDER.map(bucket => {
      const bp = plays.filter(r => rowDownGroup(r) === bucket);
      if (!bp.length) return null;
      const run  = bp.filter(r => playTypePTC(r) === "run").length;
      const pass = bp.filter(r => playTypePTC(r) === "pass").length;
      const rpo  = bp.filter(r => playTypePTC(r) === "rpo").length;
      const tot  = bp.length;
      return { bucket, tot, run, pass, rpo,
        rPct:   Math.round(run  / tot * 100),
        psPct:  Math.round(pass / tot * 100),
        rpoPct: Math.round(rpo  / tot * 100),
      };
    }).filter(Boolean);
  }, [plays]);

  if (!rows.length) return <div style={{ color: "var(--text3)", fontSize: 11 }}>Keine Down-Daten.</div>;

  return (
    <div style={{ fontSize: 11 }}>
      {/* header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 30px 30px 30px 30px",
        gap: 3, padding: "4px 6px",
        borderBottom: "1px solid var(--border)",
        color: "var(--text3)", fontWeight: 700, fontSize: 9, letterSpacing: .3,
      }}>
        <span>D&D</span>
        <span style={{ textAlign: "right" }}>N</span>
        <span style={{ textAlign: "right", color: RUN_COLOR  }}>R%</span>
        <span style={{ textAlign: "right", color: RPO_COLOR  }}>O%</span>
        <span style={{ textAlign: "right", color: PASS_COLOR }}>P%</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.bucket} style={{
          display: "grid", gridTemplateColumns: "1fr 30px 30px 30px 30px",
          gap: 3, padding: "4px 6px", alignItems: "center",
          background: i % 2 === 0 ? "transparent" : "var(--surface2)",
        }}>
          <span style={{ color: "var(--text)", fontSize: 10 }}>{row.bucket}</span>
          <span style={{ textAlign: "right", color: "var(--text3)" }}>{row.tot}</span>
          <span style={{ textAlign: "right", color: RUN_COLOR,  fontWeight: 600 }}>{row.rPct}</span>
          <span style={{ textAlign: "right", color: RPO_COLOR,  fontWeight: 600 }}>{row.rpoPct}</span>
          <span style={{ textAlign: "right", color: PASS_COLOR, fontWeight: 600 }}>{row.psPct}</span>
        </div>
      ))}
    </div>
  );
}

// ── Count values in a column, sorted by frequency ────────────────────────────
function countCol(plays, col) {
  const counts = {};
  plays.forEach(r => {
    const v = norm(r[col]);
    if (v) counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// ── Play Breakdown: 3 boxes (Run Plays | F Routes | B Routes) ────────────────
function PlayBreakdown({ plays }) {
  const runPlays = plays.filter(r => playTypePTC(r) === "run");
  const rpoPlays = plays.filter(r => playTypePTC(r) === "rpo");
  const passPlays = plays.filter(r => playTypePTC(r) === "pass" || playTypePTC(r) === "rpo");

  const runCounts  = countCol([...runPlays, ...rpoPlays], "OFF PLAY");
  const fRoutes    = countCol(passPlays, "F ROUTES");
  const bRoutes    = countCol(passPlays, "B ROUTES");

  const hasAny = runCounts.length || fRoutes.length || bRoutes.length;
  if (!hasAny) return null;

  const boxes = [
    { label: "F Routes",  color: PASS_COLOR, entries: fRoutes,   n: passPlays.length },
    { label: "Run Plays", color: RUN_COLOR,  entries: runCounts, n: runPlays.length + rpoPlays.length },
    { label: "B Routes",  color: PASS_COLOR, entries: bRoutes,   n: passPlays.length },
  ];

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      {boxes.map(({ label, color, entries, n }) => (
        <div key={label} style={{
          flex: 1, minWidth: 0,
          border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden",
        }}>
          {/* Box header */}
          <div style={{
            padding: "5px 8px", background: "var(--surface2)",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: .3 }}>{label}</span>
            <span style={{ fontSize: 9, color: "var(--text3)" }}>{n} plays</span>
          </div>
          {/* Entries */}
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {entries.length === 0 ? (
              <div style={{ padding: "6px 8px", fontSize: 10, color: "var(--text3)" }}>—</div>
            ) : entries.map(([val, cnt]) => (
              <div key={val} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "3px 8px", fontSize: 11,
                borderBottom: "1px solid var(--border)",
              }}>
                <span style={{
                  color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", flex: 1, marginRight: 6,
                }}>{val}</span>
                <span style={{
                  color: "var(--text3)", fontWeight: 700, fontSize: 10,
                  background: "var(--surface2)", borderRadius: 4,
                  padding: "1px 5px", flexShrink: 0,
                }}>{cnt}×</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single Formation+Backfield card ──────────────────────────────────────────
function FormBFCard({ form, bf, plays, images }) {
  const s = calcStats(plays);
  const imgKey = bf && bf !== "—" ? `${form} ${bf}` : form;
  const imgUrl = findImage(imgKey, images) || findImage(form, images);
  const label  = bf ? (bf === "—" ? form : `${form} · ${bf}`) : form;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10, overflow: "hidden", minWidth: 200, flex: "1 1 200px",
      display: "flex", flexDirection: "column",
    }}>
      {/* Image */}
      <div style={{
        height: 120, background: "var(--surface2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        {imgUrl
          ? <img src={imgUrl} alt={label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          : <span style={{ color: "var(--text3)", fontSize: 11 }}>Kein Bild</span>
        }
      </div>

      {/* Stats */}
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{label}</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>{s.total} plays</span>
        </div>

        <StackBar run={s.run} pass={s.pass} rpo={s.rpo} height={8} />

        <div style={{ display: "flex", gap: 6, fontSize: 11, fontWeight: 700 }}>
          {s.rPct   > 0 && <span style={{ color: RUN_COLOR  }}>{s.rPct}% R</span>}
          {s.rpoPct > 0 && <span style={{ color: RPO_COLOR  }}>{s.rpoPct}% O</span>}
          {s.psPct  > 0 && <span style={{ color: PASS_COLOR }}>{s.psPct}% P</span>}
        </div>

        {/* D&D mini table */}
        {s.total > 0 && (
          <div style={{
            marginTop: 4, border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden",
          }}>
            <DnDMini plays={plays} />
          </div>
        )}

        {/* Play Breakdown: Run Plays | F Routes | B Routes */}
        {s.total > 0 && <PlayBreakdown plays={plays} />}
      </div>
    </div>
  );
}

// ── Overview table (no selection) ────────────────────────────────────────────
// Groups by OFF FORM only, shows absolute counts + % for Run / RPO / Pass
const COL = "1fr 64px 52px 64px 52px 64px 52px 64px";

function pctColor(pct, color) { return pct > 70 ? color : "var(--text)"; }

function OverviewTable({ allRows }) {
  const rows = useMemo(() => {
    const map = {};
    allRows.forEach(r => {
      const form = norm(r["OFF FORM"]);
      if (!form) return;
      if (!map[form]) map[form] = { form, plays: [] };
      map[form].plays.push(r);
    });
    return Object.values(map)
      .map(e => ({ ...e, ...calcStats(e.plays) }))
      .sort((a, b) => b.total - a.total);
  }, [allRows]);

  if (!rows.length) return null;

  const cellH = { textAlign: "right", fontSize: 11, color: "#fff", fontWeight: 700, letterSpacing: .3 };
  const cellN = { textAlign: "right", fontSize: 12, color: "var(--text)" };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: COL,
        gap: 0, padding: "9px 14px",
        background: GREEN,
      }}>
        <span style={{ fontSize: 11, color: "#fff", fontWeight: 700, letterSpacing: .3 }}>Formation</span>
        <span style={{ ...cellH }}>Total</span>
        <span style={{ ...cellH }}>Run</span>
        <span style={{ ...cellH }}>Run%</span>
        <span style={{ ...cellH }}>RPO</span>
        <span style={{ ...cellH }}>RPO%</span>
        <span style={{ ...cellH }}>Pass</span>
        <span style={{ ...cellH }}>Pass%</span>
      </div>

      {rows.map((row, i) => (
        <div key={row.form} style={{
          display: "grid", gridTemplateColumns: COL,
          gap: 0, padding: "8px 14px", alignItems: "center",
          background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)",
          borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{row.form}</span>
          <span style={{ ...cellN, fontWeight: 700 }}>{row.total}</span>
          <span style={{ ...cellN }}>{row.run}</span>
          <span style={{ ...cellN, fontWeight: 700, color: pctColor(row.rPct,   RUN_COLOR)  }}>{row.rPct}%</span>
          <span style={{ ...cellN }}>{row.rpo}</span>
          <span style={{ ...cellN, fontWeight: 700, color: pctColor(row.rpoPct, RPO_COLOR)  }}>{row.rpoPct}%</span>
          <span style={{ ...cellN }}>{row.pass}</span>
          <span style={{ ...cellN, fontWeight: 700, color: pctColor(row.psPct,  PASS_COLOR) }}>{row.psPct}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Formations() {
  const { selectedGame, selectedSeason, mode, playRows, liveRows } = useApp();
  const [images,   setImages]   = useState({});
  const [selForms, setSelForms] = useState([]);          // multi-select formations
  const [selBFs,   setSelBFs]   = useState({});          // { [form]: string[] }

  const rows    = mode === "live" ? liveRows : playRows;
  const allRows = useMemo(() => filterAnalyticsRows(rows), [rows]);

  useEffect(() => {
    const teamId = selectedSeason?.team_id;
    if (!teamId) { setImages({}); return; }
    apiGetImages(teamId).then(setImages).catch(() => setImages({}));
  }, [selectedSeason?.team_id]);

  // Reset selections when game changes
  useEffect(() => { setSelForms([]); setSelBFs({}); }, [selectedGame?.id]);

  // Unique base formations sorted by frequency
  const baseFormations = useMemo(() => {
    const counts = {};
    allRows.forEach(r => { const f = norm(r["OFF FORM"]); if (f) counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([form, count]) => ({ form, count }));
  }, [allRows]);

  // Backfields available per formation
  const bfsByForm = useMemo(() => {
    const result = {};
    selForms.forEach(form => {
      const counts = {};
      allRows.filter(r => norm(r["OFF FORM"]) === form).forEach(r => {
        const bf = norm(r["BACKFIELD"]) || "—";
        counts[bf] = (counts[bf] || 0) + 1;
      });
      result[form] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([bf, count]) => ({ bf, count }));
    });
    return result;
  }, [allRows, selForms]);

  // Toggle helpers
  const toggleForm = (form) => {
    setSelForms(prev => prev.includes(form) ? prev.filter(f => f !== form) : [...prev, form]);
    setSelBFs(prev => { const n = { ...prev }; delete n[form]; return n; });
  };
  const toggleBF = (form, bf) =>
    setSelBFs(prev => {
      const cur = prev[form] || [];
      return { ...prev, [form]: cur.includes(bf) ? cur.filter(b => b !== bf) : [...cur, bf] };
    });

  // Effective BFs for a given form (null = show "All" as single card)
  const effectiveBFsFor = (form) => {
    const sel = selBFs[form] || [];
    return sel.length > 0 ? sel : [null];
  };

  if (!selectedGame) return (
    <div style={{ padding: 24, color: "var(--text3)" }}>Kein Spiel ausgewählt.</div>
  );
  if (!allRows.length) return (
    <div style={{ padding: 24, color: "var(--text3)" }}>
      Keine Play-Daten vorhanden. Bitte zunächst Play Data hochladen.
    </div>
  );

  return (
    <div id="formations-print-area" style={{ padding: "20px 24px", maxWidth: 1200 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #formations-print-area, #formations-print-area * { visibility: visible; }
          #formations-print-area {
            position: absolute; top: 0; left: 0;
            width: 153%; /* compensate for zoom: 0.65 */
            padding: 12px; box-sizing: border-box;
            zoom: 0.65;
          }
          .formations-no-print { display: none !important; }
          .formation-row:nth-child(2n) { page-break-after: always; }
          .formation-row { break-inside: avoid-page; }
          @page { margin: 8mm; size: A4 portrait; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ color: "var(--text)", fontSize: 16, fontWeight: 700 }}>Formation Overview</span>
        <span style={{ color: "var(--text3)", fontSize: 12 }}>
          {baseFormations.length} Formationen · {allRows.length} Plays
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {(selForms.length > 0 || Object.keys(selBFs).length > 0) && (
            <button className="formations-no-print" onClick={() => { setSelForms([]); setSelBFs({}); }} style={{
              fontSize: 11, color: "var(--text3)", background: "none",
              border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", cursor: "pointer",
            }}>Auswahl zurücksetzen</button>
          )}
          <button className="formations-no-print" onClick={() => window.print()} style={{
            fontSize: 11, fontWeight: 700, color: "#fff", background: GREEN,
            border: "none", borderRadius: 6, padding: "5px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>🖨 Print</button>
        </div>
      </div>

      {/* ── Formation Auswahl ── */}
      <div className="formations-no-print" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--text3)", fontWeight: 700,
          letterSpacing: .5, marginBottom: 7 }}>FORMATION AUSWAHL</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {baseFormations.map(({ form, count }) => (
            <Chip key={form} label={form} sub={count}
              active={selForms.includes(form)} onClick={() => toggleForm(form)} />
          ))}
        </div>
      </div>


      {/* ── Kein Formation gewählt → Übersichtstabelle ── */}
      {selForms.length === 0 && (
        <OverviewTable allRows={allRows} />
      )}

      {/* ── Formation-Zeilen (eine pro Formation, Cards nebeneinander pro BF) ── */}
      {selForms.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {selForms.map(form => (
            <div key={form} className="formation-row">
              {/* Formation-Zeilen-Header + Backfield-Chips */}
              <div style={{
                marginBottom: 10, paddingBottom: 10,
                borderBottom: "2px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{form}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>
                    {allRows.filter(r => norm(r["OFF FORM"]) === form).length} Plays
                  </span>
                </div>
                {(bfsByForm[form] || []).length > 0 && (
                  <div className="formations-no-print" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(bfsByForm[form] || []).map(({ bf, count }) => (
                      <Chip key={bf}
                        label={bf === "—" ? "Kein BF" : bf}
                        sub={count}
                        active={(selBFs[form] || []).includes(bf)}
                        onClick={() => toggleBF(form, bf)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Cards nebeneinander, eine pro Backfield */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
                {effectiveBFsFor(form).map(bf => {
                  const plays = filterPlays(allRows, form, bf);
                  if (!plays.length) return null;
                  return (
                    <FormBFCard
                      key={bf ?? "__all__"}
                      form={form}
                      bf={bf}
                      plays={plays}
                      images={images}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
