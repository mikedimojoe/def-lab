import { useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { getLiveRows } from "../lib/storage";
import { computePlaytypeStats } from "../lib/dataEngine";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "16px 20px", flex: 1, minWidth: 120,
    }}>
      <div style={{ color: "var(--text3)", fontSize: 11,
        textTransform: "uppercase", letterSpacing: .8 }}>{label}</div>
      <div style={{ color: "var(--text)", fontSize: 28, fontWeight: 700, margin: "4px 0 2px" }}>
        {value}
      </div>
      {sub && <div style={{ color: "var(--text3)", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export default function Overview() {
  const { selectedGame, mode } = useApp();

  const rows = useMemo(() => {
    if (!selectedGame) return [];
    if (mode === "live") return getLiveRows(selectedGame.id);
    try {
      return selectedGame.playdata ? JSON.parse(selectedGame.playdata) : [];
    } catch { return []; }
  }, [selectedGame, mode]);

  const { total, tableRows } = useMemo(() => computePlaytypeStats(rows), [rows]);

  const offRows  = rows.filter(r => r["ODK"] === "O");
  const runCount = offRows.filter(r => r["PLAY TYPE"] === "Run").length;
  const passCount= offRows.filter(r => r["PLAY TYPE"] === "Pass").length;
  const runPct   = total ? Math.round((runCount  / total) * 100) : 0;
  const passPct  = total ? Math.round((passCount / total) * 100) : 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>
          Overview
        </h2>
        {selectedGame && (
          <p style={{ color: "var(--text3)", fontSize: 13, margin: "4px 0 0" }}>
            W{selectedGame.week} — {selectedGame.opponent}
            {selectedGame.date ? ` · ${selectedGame.date}` : ""}
            <span style={{
              marginLeft: 8, fontSize: 11,
              background: mode === "live" ? "#154734" : "var(--surface2)",
              color: mode === "live" ? "#5CBF8A" : "var(--text3)",
              padding: "2px 8px", borderRadius: 10,
            }}>
              {mode === "live" ? "LIVE" : "PREP"}
            </span>
          </p>
        )}
      </div>

      {!selectedGame ? (
        <EmptyCard>Select a game from the sidebar file tree.</EmptyCard>
      ) : rows.length === 0 ? (
        <EmptyCard>
          {mode === "live"
            ? "No live data yet. Switch to Live Tagging to enter plays."
            : "No playdata uploaded. Go to Admin → select game → Upload .xlsx"}
        </EmptyCard>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Offense Plays" value={total} />
            <StatCard label="Run"  value={runCount}  sub={`${runPct}%`} />
            <StatCard label="Pass" value={passCount} sub={`${passPct}%`} />
            <StatCard label="Total Plays" value={rows.length} />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              flex: 1, minWidth: 260,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "16px 18px",
            }}>
              <h3 style={panelTitle}>Down &amp; Distance</h3>
              <DDTable rows={tableRows} />
            </div>
            <div style={{
              flex: 1, minWidth: 300,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "16px 18px",
            }}>
              <h3 style={panelTitle}>Run / Pass Distribution</h3>
              <RunPassBar rows={tableRows} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyCard({ children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 32, textAlign: "center",
      color: "var(--text3)", fontSize: 14,
    }}>
      {children}
    </div>
  );
}

const panelTitle = {
  color: "var(--text3)", fontSize: 11, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px", fontWeight: 600,
};
