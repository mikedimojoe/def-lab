import { useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { getLiveRows } from "../lib/storage";
import { computePlaytypeStats, DOWN_ORDER } from "../lib/dataEngine";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";

const ACCENT = "#5CBF8A";
const GREEN  = "#154734";

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
      padding: "16px 20px", flex: 1,
    }}>
      <div style={{ color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: .8 }}>
        {label}
      </div>
      <div style={{ color: "#eee", fontSize: 28, fontWeight: 700, margin: "4px 0 2px" }}>
        {value}
      </div>
      {sub && <div style={{ color: "#555", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export default function Overview() {
  const { selectedGame, mode } = useApp();

  const rows = useMemo(() => {
    if (!selectedGame) return [];
    if (mode === "live") return getLiveRows(selectedGame.id);
    try {
      const pd = selectedGame.playdata;
      return pd ? JSON.parse(pd) : [];
    } catch { return []; }
  }, [selectedGame, mode]);

  const { total, tableRows } = useMemo(
    () => computePlaytypeStats(rows), [rows]);

  const offRows = rows.filter(r => r["ODK"] === "O");
  const runCount  = offRows.filter(r => r["PLAY TYPE"] === "Run").length;
  const passCount = offRows.filter(r => r["PLAY TYPE"] === "Pass").length;
  const runPct    = total ? Math.round((runCount / total) * 100) : 0;
  const passPct   = total ? Math.round((passCount / total) * 100) : 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: "#eee", margin: 0, fontSize: 20, fontWeight: 700 }}>
          Übersicht
        </h2>
        {selectedGame && (
          <p style={{ color: "#555", fontSize: 13, margin: "4px 0 0" }}>
            W{selectedGame.week} — {selectedGame.opponent}
            {selectedGame.date ? ` · ${selectedGame.date}` : ""}
            <span style={{
              marginLeft: 8, fontSize: 11, background: mode === "live" ? "#154734" : "#222",
              color: mode === "live" ? "#5CBF8A" : "#666",
              padding: "2px 8px", borderRadius: 10,
            }}>
              {mode === "live" ? "LIVE" : "PREP"}
            </span>
          </p>
        )}
      </div>

      {!selectedGame ? (
        <div style={{
          background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
          padding: 32, textAlign: "center",
        }}>
          <p style={{ color: "#555", margin: 0 }}>
            Wähle ein Spiel aus der Sidebar
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div style={{
          background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
          padding: 32, textAlign: "center",
        }}>
          <p style={{ color: "#555", margin: 0 }}>
            {mode === "live"
              ? "Noch keine Live-Daten. Wechsle zu Live Tagging um Plays einzutragen."
              : "Keine Playdata hochgeladen. Gehe zu Admin → Spiel → Playdata hochladen."}
          </p>
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Plays (Offense)" value={total} />
            <StatCard label="Run" value={`${runCount}`} sub={`${runPct}%`} />
            <StatCard label="Pass" value={`${passCount}`} sub={`${passPct}%`} />
            <StatCard label="Plays (Total)" value={rows.length} />
          </div>

          {/* D&D table + chart */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              flex: 1, minWidth: 260,
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
              padding: "16px 18px",
            }}>
              <h3 style={{ color: "#888", fontSize: 12, textTransform: "uppercase",
                letterSpacing: .8, margin: "0 0 12px" }}>
                Down & Distance
              </h3>
              <DDTable rows={tableRows} />
            </div>

            <div style={{
              flex: 1, minWidth: 300,
              background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8,
              padding: "16px 18px",
            }}>
              <h3 style={{ color: "#888", fontSize: 12, textTransform: "uppercase",
                letterSpacing: .8, margin: "0 0 12px" }}>
                Run / Pass Verteilung
              </h3>
              <RunPassBar rows={tableRows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
