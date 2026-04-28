import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { getLiveRows } from "../lib/storage";
import { computePersonnelStats } from "../lib/dataEngine";
import DDTable from "../components/DDTable";

const PASS_COLOR = "#4472C4";
const RUN_COLOR  = "#7B6EA0";
const ACCENT     = "#5CBF8A";

// Simple SVG pie chart
function PieChart({ items = [] }) {
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.count, 0);
  if (!total) return null;

  const COLORS = ["#154734","#5CBF8A","#4472C4","#7B6EA0","#E0A940","#C05050","#50A0C0","#A0C050"];
  const R = 55, CX = 70, CY = 70;

  let cumAngle = -Math.PI / 2;
  const slices = items.map((it, i) => {
    const angle = (it.count / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(cumAngle);
    const y1 = CY + R * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = CX + R * Math.cos(cumAngle);
    const y2 = CY + R * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    return { ...it, path: `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z`,
             color: COLORS[i % COLORS.length] };
  });

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="#1a1a1a" strokeWidth="1" />
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
      <h2 style={{ color: "#eee", margin: "0 0 16px", fontSize: 20, fontWeight: 700 }}>Personnel</h2>

      {noData ? (
        <EmptyState selectedGame={selectedGame} mode={mode} />
      ) : (
        <>
          {/* Personnel selector */}
          <div style={{ marginBottom: 20 }}>
            <select value={selP} onChange={e => setSelP(e.target.value)} style={selStyle}>
              <option value="">Alle Personnel</option>
              {allPersonnel.map(p => (
                <option key={p.name} value={p.name}>{p.name} ({p.count}×)</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* D&D table */}
            {detail && (
              <div style={{ flex: 2, minWidth: 260, background: "#1a1a1a",
                border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 18px" }}>
                <h3 style={secTitle}>Down & Distance — {selP}</h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[["Plays", detail.total],
                    ["Run",   `${detail.run} (${detail.runPct}%)`],
                    ["Pass",  `${detail.pass} (${detail.passPct}%)`]].map(([l,v]) => (
                    <div key={l} style={{ background: "#222", borderRadius: 6, padding: "6px 12px" }}>
                      <div style={{ color: "#666", fontSize: 10, textTransform: "uppercase" }}>{l}</div>
                      <div style={{ color: "#eee", fontSize: 18, fontWeight: 700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <DDTable rows={detail.ddRows} />
              </div>
            )}

            {/* Formation usage */}
            {detail && (
              <div style={{ flex: 1, minWidth: 200, background: "#1a1a1a",
                border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 18px" }}>
                <h3 style={secTitle}>Formationen</h3>
                {detail.formations.map(f => (
                  <div key={f.name} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ color: "#ccc", fontSize: 12 }}>{f.name}</span>
                      <span style={{ color: ACCENT, fontSize: 11, fontWeight: 600 }}>
                        {f.count}× · {f.pct}%
                      </span>
                    </div>
                    <div style={{ height: 4, background: "#2a2a2a", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${f.pct}%`, background: "#154734", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Personnel pie */}
            <div style={{ minWidth: 160, background: "#1a1a1a",
              border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 18px",
              display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h3 style={{ ...secTitle, alignSelf: "flex-start" }}>Verteilung</h3>
              <PieChart items={allPersonnel.slice(0, 8)} />
              <div style={{ width: "100%", marginTop: 8 }}>
                {allPersonnel.slice(0, 6).map((p, i) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 11, color: "#888", marginBottom: 3 }}>
                    <span>{p.name}</span>
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

function EmptyState({ selectedGame, mode }) {
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a",
      borderRadius: 8, padding: 32, textAlign: "center" }}>
      <p style={{ color: "#555", margin: 0 }}>
        {!selectedGame ? "Wähle ein Spiel aus der Sidebar"
          : mode === "live" ? "Noch keine Live-Daten."
          : "Keine Playdata hochgeladen."}
      </p>
    </div>
  );
}

const selStyle = {
  background: "#1e1e1e", color: "#ddd", border: "1px solid #333",
  borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none",
};
const secTitle = {
  color: "#888", fontSize: 12, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px",
};
