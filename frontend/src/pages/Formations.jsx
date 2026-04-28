import { useMemo, useState } from "react";
import { useApp } from "../contexts/AppContext";
import { getLiveRows } from "../lib/storage";
import { computeFormationStats, uniqueValues } from "../lib/dataEngine";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";
import Top3Card from "../components/Top3Card";

export default function Formations() {
  const { selectedGame, mode } = useApp();
  const [selForm, setSelForm]  = useState("");
  const [selBF,   setSelBF]    = useState("");

  const rows = useMemo(() => {
    if (!selectedGame) return [];
    if (mode === "live") return getLiveRows(selectedGame.id);
    try { return selectedGame.playdata ? JSON.parse(selectedGame.playdata) : []; }
    catch { return []; }
  }, [selectedGame, mode]);

  const formations = useMemo(() => uniqueValues(rows.filter(r => r["ODK"]==="O"), "OFF FORM"), [rows]);
  const backfields  = useMemo(() => {
    const filtered = rows.filter(r => r["ODK"]==="O" && (!selForm || r["OFF FORM"]===selForm));
    return uniqueValues(filtered, "BACKFIELD");
  }, [rows, selForm]);

  const stats = useMemo(
    () => computeFormationStats(rows, selForm || undefined, selBF || undefined),
    [rows, selForm, selBF]);

  const noData = !selectedGame || rows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000 }}>
      <h2 style={{ color: "#eee", margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Formationen</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelBF(""); }}
          style={selStyle}>
          <option value="">Alle Formationen</option>
          {formations.map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={selBF} onChange={e => setSelBF(e.target.value)} style={selStyle}>
          <option value="">Alle Backfields</option>
          {backfields.map(b => <option key={b}>{b}</option>)}
        </select>
      </div>

      {noData ? (
        <EmptyState selectedGame={selectedGame} mode={mode} />
      ) : (
        <>
          {/* Summary strip */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              ["Plays", stats.total],
              ["Run",   `${stats.run} (${stats.runPct}%)`],
              ["Pass",  `${stats.pass} (${stats.passPct}%)`],
            ].map(([l, v]) => (
              <div key={l} style={{
                background: "#1a1a1a", border: "1px solid #2a2a2a",
                borderRadius: 8, padding: "10px 18px",
              }}>
                <div style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: .7 }}>{l}</div>
                <div style={{ color: "#eee", fontSize: 22, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Top 3 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <Top3Card title="Top Run Plays"    emoji="🏃" items={stats.top3Run}     />
            <Top3Card title="Top Pass Plays"   emoji="🎯" items={stats.top3Pass}    />
            <Top3Card title="Top F Routes"     emoji="📐" items={stats.top3FRoutes} />
            <Top3Card title="Top B Routes"     emoji="🔀" items={stats.top3BRoutes} />
          </div>

          {/* D&D + Chart */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260, background: "#1a1a1a",
              border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={sectionTitle}>Down & Distance</h3>
              <DDTable rows={stats.ddRows} />
            </div>
            <div style={{ flex: 1, minWidth: 300, background: "#1a1a1a",
              border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={sectionTitle}>Run / Pass</h3>
              <RunPassBar rows={stats.ddRows} />
            </div>
          </div>

          {/* Backfield breakdown */}
          {stats.backfieldList.length > 0 && (
            <div style={{ marginTop: 16, background: "#1a1a1a",
              border: "1px solid #2a2a2a", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={sectionTitle}>Backfield Usage</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {stats.backfieldList.map(b => (
                  <div key={b.name} style={{
                    background: "#222", borderRadius: 6, padding: "6px 12px",
                    border: "1px solid #333",
                  }}>
                    <span style={{ color: "#ddd", fontSize: 13 }}>{b.name}</span>
                    <span style={{ color: "#5CBF8A", fontSize: 12, marginLeft: 8, fontWeight: 700 }}>
                      {b.count}× ({b.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        {!selectedGame
          ? "Wähle ein Spiel aus der Sidebar"
          : mode === "live"
            ? "Noch keine Live-Daten."
            : "Keine Playdata hochgeladen."}
      </p>
    </div>
  );
}

const selStyle = {
  background: "#1e1e1e", color: "#ddd", border: "1px solid #333",
  borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none",
};
const sectionTitle = {
  color: "#888", fontSize: 12, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px",
};
