import { useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { getLiveRows } from "../lib/storage";
import { computeCallsheetData } from "../lib/dataEngine";

const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";

// ── Run/Pass mini bar ─────────────────────────────────────────────────────────
function RunPassBar2({ run, pass, n, height = 28, fontSize = 11 }) {
  if (!n) return <div style={{ color: "var(--text3)", fontSize: 12, padding: "10px 0" }}>— no data —</div>;
  const runW  = Math.max(5, run);
  const passW = Math.max(5, pass);
  return (
    <div style={{ display: "flex", width: "100%", height, borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        flex: passW, background: PASS_COLOR, display: "flex",
        alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize, fontWeight: 700,
        minWidth: 32, overflow: "hidden",
      }}>
        {pass > 4 ? `PASS ${pass}%` : ""}
      </div>
      <div style={{
        flex: runW, background: RUN_COLOR, display: "flex",
        alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize, fontWeight: 700,
        minWidth: 32, overflow: "hidden",
      }}>
        {run > 4 ? `RUN ${run}%` : ""}
      </div>
    </div>
  );
}

// ── Tendency tile card ────────────────────────────────────────────────────────
function TendencyTile({ title, subtitle, run, pass, n, pers = [], dgRows = [] }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden", minWidth: 160, flex: 1,
    }}>
      {/* Header */}
      <div style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ padding: "8px 12px 4px", color: "var(--text)", fontWeight: 700, fontSize: 13 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ padding: "0 12px 7px", color: "var(--accent)", fontSize: 11,
            fontWeight: 600, textTransform: "uppercase", letterSpacing: .5 }}>
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 12px" }}>
        {n === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: 12, padding: "8px 0" }}>— no data —</div>
        ) : (
          <>
            <RunPassBar2 run={run} pass={pass} n={n} />
            <div style={{ color: "var(--text3)", fontSize: 10, textAlign: "right", marginTop: 3 }}>
              n={n}
            </div>

            {/* Personnel mini breakdown */}
            {pers.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                {pers.map((p, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      marginBottom: 2, fontSize: 11 }}>
                      <span style={{ color: "var(--text2)", fontWeight: 600 }}>{p.pers}</span>
                      <span style={{ color: "var(--text3)" }}>n={p.n}</span>
                    </div>
                    <div style={{ display: "flex", height: 16, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ flex: Math.max(5, p.pass), background: PASS_COLOR,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 9 }}>
                        {p.pass > 10 ? `${p.pass}%` : ""}
                      </div>
                      <div style={{ flex: Math.max(5, p.run), background: RUN_COLOR,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 9 }}>
                        {p.run > 10 ? `${p.run}%` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Down-group mini breakdown (for personnel tiles) */}
            {dgRows.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                {dgRows.map((dg, i) => (
                  <div key={i} style={{ marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      marginBottom: 2, fontSize: 10 }}>
                      <span style={{ color: "var(--text3)" }}>{dg.label}</span>
                      <span style={{ color: "var(--text3)" }}>n={dg.n}</span>
                    </div>
                    <div style={{ display: "flex", height: 14, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ flex: Math.max(5, dg.pass), background: PASS_COLOR,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 8 }}>
                        {dg.pass > 15 ? `${dg.pass}%` : ""}
                      </div>
                      <div style={{ flex: Math.max(5, dg.run), background: RUN_COLOR,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 8 }}>
                        {dg.run > 15 ? `${dg.run}%` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{ margin: "32px 0 14px" }}>
      <div style={{ height: 3, background: "var(--accent)", borderRadius: 2, marginBottom: 8 }} />
      <div style={{ background: "var(--accent)", color: "#fff", padding: "8px 16px",
        borderRadius: 4, fontSize: 14, fontWeight: 700, display: "inline-block" }}>
        {title}
      </div>
    </div>
  );
}

// ── Tile row ──────────────────────────────────────────────────────────────────
function TileRow({ tiles, emptyMsg = "No data." }) {
  if (!tiles || tiles.length === 0) {
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 16px" }}>{emptyMsg}</p>;
  }
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
      {tiles.map((t, i) => (
        <TendencyTile key={i} {...t} />
      ))}
    </div>
  );
}

// ── Main Callsheet page ───────────────────────────────────────────────────────
export default function Callsheet() {
  const { selectedGame, mode } = useApp();

  const rows = useMemo(() => {
    if (!selectedGame) return [];
    if (mode === "live") return getLiveRows(selectedGame.id);
    try { return selectedGame.playdata ? JSON.parse(selectedGame.playdata) : []; }
    catch { return []; }
  }, [selectedGame, mode]);

  const data = useMemo(() => computeCallsheetData(rows), [rows]);

  const noData = !selectedGame || rows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
      <h2 style={{ color: "var(--text)", margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>
        Callsheet Tendencies
      </h2>
      <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 4px" }}>
        Play tendency analysis by situation — run% vs pass% with personnel breakdown.
      </p>

      {noData ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 48, textAlign: "center", color: "var(--text3)", fontSize: 14,
          marginTop: 24 }}>
          {!selectedGame ? "Select a game from the sidebar."
            : mode === "live" ? "No live data yet."
            : "No playdata uploaded. Go to Admin → Upload .xlsx"}
        </div>
      ) : (
        <>
          <SectionHeader title="P&10 — First Play After Situation" />
          <TileRow tiles={data.p10Tiles}
            emptyMsg="No P&10 data found. Make sure the P&10 column is filled in." />

          <SectionHeader title="2nd Down & Distance" />
          <TileRow tiles={data.d2Tiles}
            emptyMsg="No 2nd down data found." />

          <SectionHeader title="3rd Down Groups" />
          <TileRow tiles={data.d3Tiles}
            emptyMsg="No 3rd down data found." />

          <SectionHeader title="Personnel Tendency (Top 90% of Plays)" />
          <TileRow tiles={data.persTiles}
            emptyMsg="No personnel data found." />
        </>
      )}
    </div>
  );
}
