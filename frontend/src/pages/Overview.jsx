import { useMemo } from "react";
import { useApp } from "../contexts/AppContext";
import { computePlaytypeStats, computeDrives, DRIVE_START_LABELS } from "../lib/dataEngine";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";

const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "16px 20px", flex: 1, minWidth: 120,
    }}>
      <div style={{ color: "var(--text3)", fontSize: 11, textTransform: "uppercase", letterSpacing: .8 }}>
        {label}
      </div>
      <div style={{ color: color || "var(--text)", fontSize: 28, fontWeight: 700, margin: "4px 0 2px" }}>
        {value}
      </div>
      {sub && <div style={{ color: "var(--text3)", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function DriveRow({ drive }) {
  const { number, startCode, total, run, pass, runPct, passPct } = drive;
  const label = DRIVE_START_LABELS[startCode] || startCode;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "7px 12px", borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ color: "var(--text3)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>
        {number}
      </span>
      <span style={{ color: "var(--text2)", fontSize: 12, width: 140, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: "var(--text3)", fontSize: 11, width: 48, flexShrink: 0 }}>
        {total} plays
      </span>
      {/* mini run/pass bar */}
      <div style={{ flex: 1, display: "flex", height: 18, borderRadius: 3, overflow: "hidden", minWidth: 80 }}>
        <div style={{ flex: Math.max(5, passPct), background: PASS_COLOR,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 9, fontWeight: 700 }}>
          {passPct > 15 ? `P ${passPct}%` : ""}
        </div>
        <div style={{ flex: Math.max(5, runPct), background: RUN_COLOR,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 9, fontWeight: 700 }}>
          {runPct > 15 ? `R ${runPct}%` : ""}
        </div>
      </div>
      <span style={{ color: PASS_COLOR, fontSize: 11, width: 60, textAlign: "right", flexShrink: 0 }}>
        Pass {passPct}%
      </span>
      <span style={{ color: RUN_COLOR, fontSize: 11, width: 56, textAlign: "right", flexShrink: 0 }}>
        Run {runPct}%
      </span>
    </div>
  );
}

export default function Overview() {
  const { selectedGame, mode, playRows, liveRows } = useApp();
  const rows = mode === "live" ? liveRows : playRows;

  const stats  = useMemo(() => computePlaytypeStats(rows), [rows]);
  const drives = useMemo(() => computeDrives(rows), [rows]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>Overview</h2>
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
            <StatCard label="Offense Plays" value={stats.total} />
            <StatCard label="Run"  value={stats.run}  sub={`${stats.runPct}%`}  color={RUN_COLOR} />
            <StatCard label="Pass" value={stats.pass} sub={`${stats.passPct}%`} color={PASS_COLOR} />
            <StatCard label="Total Plays" value={rows.length} />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 280, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={panelTitle}>Down &amp; Distance</h3>
              <DDTable rows={stats.tableRows} />
            </div>
            <div style={{ flex: 1, minWidth: 300, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={panelTitle}>Run / Pass Distribution</h3>
              <RunPassBar rows={stats.chartRows} />
            </div>
          </div>

          {drives.length > 0 && (
            <div style={{ marginTop: 20, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{ ...panelTitle, margin: 0 }}>Drive Breakdown</h3>
                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                  {drives.length} drive{drives.length !== 1 ? "s" : ""}
                </span>
              </div>
              {/* column header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "5px 12px", background: "var(--surface2)" }}>
                <span style={{ color: "var(--text3)", fontSize: 10, width: 20, textAlign: "right", flexShrink: 0 }}>#</span>
                <span style={{ color: "var(--text3)", fontSize: 10, width: 140, flexShrink: 0 }}>Start situation</span>
                <span style={{ color: "var(--text3)", fontSize: 10, width: 48, flexShrink: 0 }}>Plays</span>
                <span style={{ color: "var(--text3)", fontSize: 10, flex: 1 }}>Run / Pass</span>
                <span style={{ color: "var(--text3)", fontSize: 10, width: 60, textAlign: "right", flexShrink: 0 }}>Pass%</span>
                <span style={{ color: "var(--text3)", fontSize: 10, width: 56, textAlign: "right", flexShrink: 0 }}>Run%</span>
              </div>
              {drives.map(d => <DriveRow key={d.number} drive={d} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyCard({ children }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
      {children}
    </div>
  );
}

const panelTitle = {
  color: "var(--text3)", fontSize: 11, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px", fontWeight: 600,
};
