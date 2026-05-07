import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { computeCallsheetData, computeCallsheetDataPrep } from "../lib/dataEngine";

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#d4782a";

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
          fontSize: 10, color: "var(--accent)", background: "none",
          border: "none", cursor: "pointer", marginRight: 6, padding: 0,
          textDecoration: "underline"
        }}>All</button>
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
function PersonnelBreakdown({ pers }) {
  if (!pers || pers.length === 0) return null;
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
      {pers.map((p, j) => (
        <div key={j} style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            marginBottom: 2, fontSize: 11 }}>
            <span style={{ color: "var(--text2)", fontWeight: 600 }}>{p.pers}</span>
            <span style={{ color: "var(--text3)" }}>n={p.n}</span>
          </div>
          <RPOBar run={p.run} pass={p.pass} rpo={p.rpo} n={p.n} height={16} fontSize={9} />
        </div>
      ))}
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

// ── Tile row (prep mode) ──────────────────────────────────────────────────────
function TileRow({ tiles, emptyMsg = "No data." }) {
  if (!tiles || tiles.length === 0) {
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 12px" }}>{emptyMsg}</p>;
  }
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
      {tiles.map((t, i) => (
        <TendCard key={i} title={t.title} subtitle={t.subtitle} run={t.run} pass={t.pass} rpo={t.rpo} n={t.n}>
          <PersonnelBreakdown pers={t.pers} />
        </TendCard>
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
                     onToggleFP, onClearFP, onToggleDrive, showDrive }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "12px 16px", marginBottom: 20,
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text2)",
        textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
        Filters
      </div>
      <ChipFilter label="Personnel" options={data.allPersonnel}
        selected={persFilter} onToggle={onTogglePers} onClearAll={onClearPers} />
      <ChipFilter label="Field Position" options={data.allFPZones}
        selected={fpFilter} onToggle={onToggleFP} onClearAll={onClearFP} />
      {showDrive && data.allDrives?.length > 0 && (
        <ChipFilter label="Drive" options={data.allDrives}
          selected={driveFilter} onToggle={onToggleDrive}
          onClearAll={() => driveFilter.forEach(d => onToggleDrive(d))} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREP VIEW (P&10 tiles)
// ══════════════════════════════════════════════════════════════════════════════
function PrepCallsheet({ rows }) {
  const [persFilter, setPersFilter] = useState([]);
  const [fpFilter,   setFpFilter]   = useState([]);

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
          onToggleDrive={() => {}} showDrive={false} />
      )}
      <SectionHeader title="P&10 — First Play After Situation" />
      <TileRow tiles={data.p10Tiles}
        emptyMsg="No P&10 data found. Make sure the P&10 column is filled in." />
      <SectionHeader title="2nd Down & Distance" />
      {data.d2Tiles.length === 0
        ? <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 12px" }}>No 2nd down data found.</p>
        : <div style={{ display: "flex", gap: 10, flexWrap: "nowrap", overflowX: "auto",
            paddingBottom: 4, marginBottom: 4 }}>
            {data.d2Tiles.map((t, i) => (
              <div key={i} style={{ flex: "0 0 170px" }}>
                <TendCard {...t}>
                  <PersonnelBreakdown pers={t.pers} />
                </TendCard>
              </div>
            ))}
          </div>
      }
      <SectionHeader title="3rd Down Groups" />
      <TileRow tiles={data.d3Tiles} emptyMsg="No 3rd down data found." />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE VIEW (Drive Opener / 1st&10 / After Conversion + 2nd Down grid)
// ══════════════════════════════════════════════════════════════════════════════
function LiveCallsheet({ rows }) {
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
          showDrive={data.allDrives?.length > 0} />
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
      ) : (
        <div style={{ overflowX: "auto", marginBottom: 8 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `170px repeat(${data.d2Section.length}, minmax(150px, 1fr))`,
            border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
            minWidth: 400,
          }}>
            {/* Header row */}
            <D2Cell data="" isHeader />
            {data.d2Section.map(b => (
              <D2Cell key={b.label} data={b.label} isHeader />
            ))}

            {/* Data rows: After Pass / After Run / After RPO only */}
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
                    style={{
                      background: ri % 2 === 0 ? "var(--surface2)" : "var(--surface)",
                    }}
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
