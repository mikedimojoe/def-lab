import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { getLiveRows } from "../lib/storage";
import { computePersonnelStats } from "../lib/dataEngine";
import DDTable from "../components/DDTable";

const ACCENT = "#5CBF8A";
const PIE_COLORS = ["#154734","#5CBF8A","#4472C4","#7B6EA0","#E0A940","#C05050","#50A0C0","#A0C050"];

function PieChart({ items = [] }) {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.count, 0);
  if (!total) return null;
  const R = 52, CX = 68, CY = 68;
  let cumAngle = -Math.PI / 2;
  const slices = items.map((it, i) => {
    const angle = (it.count / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(cumAngle);
    const y1 = CY + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = CX + R * Math.cos(cumAngle);
    const y2 = CY + R * Math.sin(cumAngle);
    return { ...it,
      path: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z`,
      color: PIE_COLORS[i % PIE_COLORS.length] };
  });
  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="var(--bg)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export default function Personnel() {
  const { selectedGame, mode } = useApp();
  const [selP, setSelP] = useState("");

  const rows = useMemo(() => {
    if (!selectedGame) return [];
    if (mode === "live") return getLiveRows(selectedGame.id);
    try { return selectedGame.playdata ? JSON.parse(selectedGame.playdata) : []; }
    catch { return []; }
  }, [selectedGame, mode]);

  const { allPersonnel, detail } = useMemo(
    () => computePersonnelStats(rows, selP || undefined), [rows, selP]);

  const noData = !selectedGame || rows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000 }}>
      <h2 style={{ color: "var(--text)", margin: "0 0 16px", fontSize: 20, fontWeight: 700 }}>
        Personnel
      </h2>

      {noData ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 32, textAlign: "center",
          color: "var(--text3)", fontSize: 14 }}>
          {!selectedGame ? "Select a game from the sidebar."
            : mode === "live" ? "No live data yet."
            : "No playdata uploaded. Go to Admin → Upload .xlsx"}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 18 }}>
            <select value={selP} onChange={e => setSelP(e.target.value)} style={selStyle}>
              <option value="">All Personnel</option>
              {allPersonnel.map(p => (
                <option key={p.name} value={p.name}>{p.name} ({p.count}×)</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* D&D breakdown */}
            {detail && (
              <div style={{ flex: 2, minWidth: 260, background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
                <h3 style={panelTitle}>D&amp;D — {selP}</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[["Plays", detail.total],
                    ["Run",   `${detail.run} (${detail.runPct}%)`],
                    ["Pass",  `${detail.pass} (${detail.passPct}%)`]].map(([l, v]) => (
                    <div key={l} style={{ background: "var(--surface2)", borderRadius: 6, padding: "6px 12px" }}>
                      <div style={{ color: "var(--text3)", fontSize: 10, textTransform: "uppercase" }}>{l}</div>
                      <div style={{ color: "var(--text)", fontSize: 18, fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <DDTable rows={detail.ddRows} />
              </div>
            )}

            {/* Formation usage */}
            {detail && (
              <div style={{ flex: 1, minWidth: 200, background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
                <h3 style={panelTitle}>Formation Usage</h3>
                {detail.formations.map(f => (
                  <div key={f.name} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ color: "var(--text2)", fontSize: 12 }}>{f.name}</span>
                      <span style={{ color: ACCENT, fontSize: 11, fontWeight: 600 }}>
                        {f.count}× · {f.pct}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${f.pct}%`,
                        background: "#154734", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Distribution pie */}
            <div style={{ minWidth: 160, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px",
              display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h3 style={{ ...panelTitle, alignSelf: "flex-start" }}>Distribution</h3>
              <PieChart items={allPersonnel.slice(0, 8)} />
              <div style={{ width: "100%", marginTop: 8 }}>
                {allPersonnel.slice(0, 6).map((p, i) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 11, color: "var(--text3)", marginBottom: 3 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%",
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        display: "inline-block", flexShrink: 0 }} />
                      {p.name}
                    </span>
                    <span style={{ color: ACCENT }}>{p.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const selStyle = {
  background: "var(--surface)", color: "var(--text2)",
  border: "1px solid var(--border)", borderRadius: 6,
  padding: "7px 10px", fontSize: 13, outline: "none",
};
const panelTitle = {
  color: "var(--text3)", fontSize: 11, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px", fontWeight: 600,
};
