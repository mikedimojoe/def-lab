import { useMemo, useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import {
  computePlaytypeStats, computeDrives, DRIVE_START_LABELS,
  rowDownGroup, DOWN_GROUP_PARENT,
} from "../lib/dataEngine";
import { apiGetLiveRows } from "../lib/api";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";

const RUN_COLOR  = "#7B6EA0";
const PASS_COLOR = "#4472C4";
const DOWN_SIMPLE = ["1st", "2nd", "3rd", "4th"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pctInt(n, total) { return total ? Math.round(n / total * 100) : 0; }

function addStats(acc, row) {
  acc.total++;
  const pt = String(row["PLAY TYPE"] || "").trim().toLowerCase();
  if (pt === "run")  acc.run++;
  if (pt === "pass") acc.pass++;
}

function resolveDown(row) {
  return DOWN_GROUP_PARENT[rowDownGroup(row)] || null;
}

function emptyStats() { return { total: 0, run: 0, pass: 0, downs: {} }; }

// Card background tint: blue = pass-heavy, purple = run-heavy
function tendencyBg(run, pass, total) {
  if (!total) return "var(--bg)";
  const rp = pctInt(run, total);
  const pp = pctInt(pass, total);
  if (pp >= 65) return "rgba(68,114,196,.10)";
  if (rp >= 65) return "rgba(123,110,160,.10)";
  if (pp >= 55) return "rgba(68,114,196,.06)";
  if (rp >= 55) return "rgba(123,110,160,.06)";
  return "var(--bg)";
}

// ── Tendency kachel ───────────────────────────────────────────────────────────
function TendencyCard({ label, sub, total, run, pass, downs }) {
  const [activeDown, setActiveDown] = useState(null);

  const display = activeDown && downs[activeDown]
    ? downs[activeDown]
    : { total, run, pass };

  const rPct = pctInt(display.run, display.total);
  const pPct = pctInt(display.pass, display.total);
  const unknown = display.total - display.run - display.pass;
  const unknownPct = pctInt(unknown, display.total);

  const availableDowns = DOWN_SIMPLE.filter(d => downs[d]?.total > 0);

  return (
    <div style={{
      background: tendencyBg(display.run, display.pass, display.total),
      border: "1px solid var(--border)", borderRadius: 10,
      padding: "14px 16px", flex: "1 1 200px", minWidth: 180, maxWidth: 280,
      display: "flex", flexDirection: "column", gap: 10,
      transition: "background .3s",
    }}>
      {/* Label */}
      <div>
        <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 700,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </div>
        {sub && (
          <div style={{ color: "var(--text3)", fontSize: 10, marginTop: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub}
          </div>
        )}
      </div>

      {/* Big Pass / Run numbers */}
      <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden",
        border: "1px solid var(--border)" }}>
        <div style={{ flex: 1, background: `rgba(68,114,196,${pPct > 50 ? .2 : .08})`,
          padding: "8px 0", textAlign: "center" }}>
          <div style={{ color: PASS_COLOR, fontSize: 22, fontWeight: 800,
            lineHeight: 1 }}>{pPct}%</div>
          <div style={{ color: "var(--text3)", fontSize: 9, marginTop: 3,
            textTransform: "uppercase", letterSpacing: .5 }}>Pass</div>
        </div>
        <div style={{ width: 1, background: "var(--border)" }} />
        <div style={{ flex: 1, background: `rgba(123,110,160,${rPct > 50 ? .2 : .08})`,
          padding: "8px 0", textAlign: "center" }}>
          <div style={{ color: RUN_COLOR, fontSize: 22, fontWeight: 800,
            lineHeight: 1 }}>{rPct}%</div>
          <div style={{ color: "var(--text3)", fontSize: 9, marginTop: 3,
            textTransform: "uppercase", letterSpacing: .5 }}>Run</div>
        </div>
      </div>

      {/* Stacked bar */}
      <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1 }}>
        <div style={{ flex: pPct, background: PASS_COLOR, minWidth: pPct > 0 ? 2 : 0 }} />
        {unknownPct > 0 && (
          <div style={{ flex: unknownPct, background: "var(--border)", minWidth: 2 }} />
        )}
        <div style={{ flex: rPct, background: RUN_COLOR, minWidth: rPct > 0 ? 2 : 0 }} />
      </div>

      {/* Footer: total + down tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text3)", fontSize: 10,
          marginRight: 4 }}>{display.total} plays</span>
        {availableDowns.map(d => (
          <button key={d} onClick={() => setActiveDown(activeDown === d ? null : d)}
            style={{
              background: activeDown === d ? "var(--accent)" : "var(--surface2)",
              color: activeDown === d ? "#000" : "var(--text3)",
              border: "none", borderRadius: 4, padding: "2px 7px",
              fontSize: 9, fontWeight: 700, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: .4,
            }}>
            {d} {activeDown === d ? `(${downs[d].total})` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Data computation ──────────────────────────────────────────────────────────
function useFormBackData(rows) {
  return useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const map = {};
    offense.forEach(r => {
      const form = String(r["OFF FORM"]  || "").trim() || "—";
      const back = String(r["BACKFIELD"] || "").trim() || "—";
      const key  = `${form}|||${back}`;
      const dn   = resolveDown(r);
      if (!map[key]) map[key] = { ...emptyStats(), form, back };
      addStats(map[key], r);
      if (dn) {
        if (!map[key].downs[dn]) map[key].downs[dn] = { total: 0, run: 0, pass: 0 };
        addStats(map[key].downs[dn], r);
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);
}

function usePersonnelData(rows) {
  return useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const map = {};
    offense.forEach(r => {
      const pers = String(r["PERSONNEL"] || "").trim() || "—";
      const dn   = resolveDown(r);
      if (!map[pers]) map[pers] = { ...emptyStats(), pers };
      addStats(map[pers], r);
      if (dn) {
        if (!map[pers].downs[dn]) map[pers].downs[dn] = { total: 0, run: 0, pass: 0 };
        addStats(map[pers].downs[dn], r);
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);
}

function usePersFormData(rows) {
  return useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const map = {};
    offense.forEach(r => {
      const pers = String(r["PERSONNEL"] || "").trim() || "—";
      const form = String(r["OFF FORM"]  || "").trim() || "—";
      if (!map[pers]) map[pers] = { ...emptyStats(), pers, forms: {} };
      addStats(map[pers], r);
      if (!map[pers].forms[form]) map[pers].forms[form] = { ...emptyStats(), form };
      addStats(map[pers].forms[form], r);
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map(p => ({ ...p, forms: Object.values(p.forms).sort((a, b) => b.total - a.total) }));
  }, [rows]);
}

// ── Personnel → Formation view ────────────────────────────────────────────────
function PersFormView({ rows }) {
  const data = usePersFormData(rows);
  if (!data.length)
    return <EmptyMsg>No personnel/formation data yet.</EmptyMsg>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {data.slice(0, 8).map((p, pi) => {
        const pPct = pctInt(p.pass, p.total);
        const rPct = pctInt(p.run,  p.total);
        return (
          <div key={pi} style={{ background: "var(--bg)", borderRadius: 10,
            border: "1px solid var(--border)", overflow: "hidden" }}>
            {/* Personnel header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              background: tendencyBg(p.run, p.pass, p.total),
              borderBottom: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 800,
                flex: 1 }}>{p.pers}</span>
              <span style={{ color: "var(--text3)", fontSize: 11 }}>{p.total} plays</span>
              {/* Mini split bar */}
              <div style={{ display: "flex", height: 20, width: 100,
                borderRadius: 4, overflow: "hidden", border: "1px solid var(--border)" }}>
                <div style={{ flex: Math.max(3, pPct), background: PASS_COLOR,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {pPct > 20 && <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>P {pPct}%</span>}
                </div>
                <div style={{ flex: Math.max(3, rPct), background: RUN_COLOR,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {rPct > 20 && <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>R {rPct}%</span>}
                </div>
              </div>
            </div>

            {/* Formations grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 16px" }}>
              {p.forms.map((f, fi) => {
                const fpPct = pctInt(f.pass, f.total);
                const frPct = pctInt(f.run,  f.total);
                const fShare = pctInt(f.total, p.total);
                return (
                  <div key={fi} style={{
                    background: tendencyBg(f.run, f.pass, f.total),
                    border: "1px solid var(--border)", borderRadius: 8,
                    padding: "8px 12px", minWidth: 140, flex: "1 1 140px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ color: "var(--text2)", fontSize: 12,
                        fontWeight: 700 }}>{f.form}</span>
                      <span style={{ color: "var(--text3)", fontSize: 10 }}>
                        {f.total}× · {fShare}%
                      </span>
                    </div>
                    <div style={{ display: "flex", height: 5, borderRadius: 2,
                      overflow: "hidden", marginBottom: 5, gap: 1 }}>
                      <div style={{ flex: Math.max(2, fpPct), background: PASS_COLOR }} />
                      <div style={{ flex: Math.max(2, frPct), background: RUN_COLOR }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: PASS_COLOR, fontSize: 10,
                        fontWeight: 700 }}>P {fpPct}%</span>
                      <span style={{ color: RUN_COLOR, fontSize: 10,
                        fontWeight: 700 }}>R {frPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Live analytics panel with tabs ────────────────────────────────────────────
const TABS = [
  { key: "personnel",  label: "Personnel" },
  { key: "formback",   label: "Formation + Backfield" },
  { key: "persform",   label: "Personnel → Formation" },
];

function LiveAnalyticsPanel({ rows, driveLabel }) {
  const [tab, setTab] = useState("personnel");

  const formBackData   = useFormBackData(rows);
  const personnelData  = usePersonnelData(rows);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, overflow: "hidden" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)",
        background: "var(--surface2)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              background: "none", border: "none",
              borderBottom: tab === t.key ? `2px solid var(--accent)` : "2px solid transparent",
              color: tab === t.key ? "var(--accent)" : "var(--text3)",
              padding: "10px 20px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "color .15s",
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
        {driveLabel && (
          <span style={{ marginLeft: "auto", padding: "10px 16px",
            color: "var(--accent)", fontSize: 11 }}>
            {driveLabel}
          </span>
        )}
      </div>

      {/* Tab content */}
      <div style={{ padding: "16px 18px", maxHeight: 520, overflowY: "auto" }}>

        {/* Legend */}
        {tab !== "persform" && (
          <div style={{ display: "flex", gap: 16, marginBottom: 14,
            alignItems: "center" }}>
            <span style={{ color: "var(--text3)", fontSize: 10 }}>
              Klicke einen Down-Button auf einer Kachel um die Tendenz für diesen Down zu sehen.
            </span>
            <LegendDot color={PASS_COLOR} label="Pass-lastig" />
            <LegendDot color={RUN_COLOR}  label="Run-lastig" />
          </div>
        )}

        {tab === "personnel" && (
          personnelData.length === 0
            ? <EmptyMsg>Keine Personnel-Daten.</EmptyMsg>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {personnelData.slice(0, 12).map((e, i) => (
                  <TendencyCard key={i}
                    label={e.pers}
                    total={e.total} run={e.run} pass={e.pass} downs={e.downs}
                  />
                ))}
              </div>
        )}

        {tab === "formback" && (
          formBackData.length === 0
            ? <EmptyMsg>Keine Formation/Backfield-Daten.</EmptyMsg>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {formBackData.slice(0, 12).map((e, i) => (
                  <TendencyCard key={i}
                    label={e.form}
                    sub={`Backfield: ${e.back}`}
                    total={e.total} run={e.run} pass={e.pass} downs={e.downs}
                  />
                ))}
              </div>
        )}

        {tab === "persform" && (
          <PersFormView rows={rows} />
        )}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
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
  const { number, startCode, total, runPct, passPct } = drive;
  const label = DRIVE_START_LABELS[startCode] || startCode;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10,
      padding: "7px 12px", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text3)", fontSize: 11, width: 20, textAlign: "right", flexShrink: 0 }}>{number}</span>
      <span style={{ color: "var(--text2)", fontSize: 12, width: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text3)", fontSize: 11, width: 48, flexShrink: 0 }}>{total} plays</span>
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
      <span style={{ color: PASS_COLOR, fontSize: 11, width: 60, textAlign: "right", flexShrink: 0 }}>Pass {passPct}%</span>
      <span style={{ color: RUN_COLOR,  fontSize: 11, width: 56, textAlign: "right", flexShrink: 0 }}>Run {runPct}%</span>
    </div>
  );
}

function FormationsPanel({ rows }) {
  const data = useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const total   = offense.length;
    const formMap = {};
    offense.forEach(r => {
      const f = String(r["OFF FORM"] || "").trim();
      if (f) formMap[f] = (formMap[f] || 0) + 1;
    });
    return Object.entries(formMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: total ? Math.round(count / total * 100) : 0 }));
  }, [rows]);

  if (!data.length)
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No formation data.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map(({ name, count, pct }) => (
        <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ color: "var(--text2)", fontSize: 12, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </span>
              <span style={{ color: "var(--text3)", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                {count}× · {pct}%
              </span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%",
                background: "var(--accent)", borderRadius: 3 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Overview() {
  const { selectedGame, mode, playRows, liveRows, setLiveRows } = useApp();
  const rows = mode === "live" ? liveRows : playRows;

  useEffect(() => {
    if (mode !== "live" || !selectedGame) return;
    const tick = () => apiGetLiveRows(selectedGame.id).then(setLiveRows).catch(() => {});
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [mode, selectedGame?.id]);

  const [selDrive, setSelDrive] = useState("All");

  const driveOptions = useMemo(() => {
    if (mode !== "live") return [];
    const seen = new Set();
    rows.forEach(r => { const d = String(r["DRIVE"] || "").trim(); if (d) seen.add(d); });
    return [...seen].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [rows, mode]);

  const filteredRows = useMemo(() => {
    if (mode !== "live" || selDrive === "All") return rows;
    return rows.filter(r => String(r["DRIVE"] || "").trim() === selDrive);
  }, [rows, mode, selDrive]);

  const stats      = useMemo(() => computePlaytypeStats(filteredRows), [filteredRows]);
  const drives     = useMemo(() => computeDrives(rows), [rows]);
  const driveCount = driveOptions.length || drives.length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12,
        marginBottom: 22, flexWrap: "wrap" }}>
        <div>
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

        {mode === "live" && driveOptions.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--text3)", fontSize: 12 }}>Drive</span>
            <select value={selDrive} onChange={e => setSelDrive(e.target.value)}
              style={{
                background: "var(--surface)", color: "var(--text2)",
                border: "1px solid var(--border)", borderRadius: 6,
                padding: "6px 10px", fontSize: 13, outline: "none", cursor: "pointer",
              }}>
              <option value="All">All</option>
              {driveOptions.map(d => (
                <option key={d} value={d}>Drive {d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedGame ? (
        <EmptyCard>Select a game from the sidebar.</EmptyCard>
      ) : rows.length === 0 ? (
        <EmptyCard>
          {mode === "live"
            ? "No live data yet. Switch to Live Tagging to enter plays."
            : "No playdata uploaded. Go to Admin → select game → Upload .xlsx"}
        </EmptyCard>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Offense Plays" value={stats.total} />
            <StatCard label="Run"  value={stats.run}  sub={`${stats.runPct}%`}  color={RUN_COLOR} />
            <StatCard label="Pass" value={stats.pass} sub={`${stats.passPct}%`} color={PASS_COLOR} />
            <StatCard label="Total Plays" value={filteredRows.length} />
            {driveCount > 0 && <StatCard label="Drives" value={driveCount} />}
          </div>

          {/* Row 1: D&D + Formations */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 280, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
              <h3 style={panelTitle}>Down &amp; Distance</h3>
              <DDTable rows={stats.tableRows} />
            </div>

            {mode === "live" ? (
              <div style={{ flex: 1, minWidth: 240, background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
                <h3 style={panelTitle}>
                  Formations
                  {selDrive !== "All" && (
                    <span style={{ color: "var(--accent)", marginLeft: 6 }}>— Drive {selDrive}</span>
                  )}
                </h3>
                <FormationsPanel rows={filteredRows} />
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 300, background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
                <h3 style={panelTitle}>Run / Pass Distribution</h3>
                <RunPassBar rows={stats.chartRows} />
              </div>
            )}
          </div>

          {/* Row 2: Live analytics (tabbed) */}
          {mode === "live" && (
            <LiveAnalyticsPanel
              rows={filteredRows}
              driveLabel={selDrive !== "All" ? `Drive ${selDrive}` : null}
            />
          )}

          {/* Drive breakdown (prep) */}
          {mode !== "live" && drives.length > 0 && (
            <div style={{ marginTop: 4, background: "var(--surface)",
              border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{ ...panelTitle, margin: 0 }}>Drive Breakdown</h3>
                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                  {drives.length} drive{drives.length !== 1 ? "s" : ""}
                </span>
              </div>
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

// ── Micro-components ──────────────────────────────────────────────────────────
function LegendDot({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
      color: "var(--text3)", fontSize: 10 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%",
        background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}

function EmptyMsg({ children }) {
  return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>{children}</p>;
}

function EmptyCard({ children }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 32, textAlign: "center",
      color: "var(--text3)", fontSize: 14 }}>
      {children}
    </div>
  );
}

const panelTitle = {
  color: "var(--text3)", fontSize: 11, textTransform: "uppercase",
  letterSpacing: .8, margin: "0 0 12px", fontWeight: 600,
};
