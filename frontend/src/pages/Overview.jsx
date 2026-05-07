import { useMemo, useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import {
  computePlaytypeStats,
  rowDownGroup, DOWN_GROUP_PARENT,
} from "../lib/dataEngine";
import { FP_ZONES } from "../lib/storage";
import { apiGetLiveRows } from "../lib/api";
import DDTable from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#D4782A";
const DOWN_SIMPLE = ["1st", "2nd", "3rd", "4th"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pctInt(n, total) { return total ? Math.round(n / total * 100) : 0; }

function addStats(acc, row) {
  acc.total++;
  const pt = String(row["PLAY TYPE CALLED"] || row["PLAY TYPE"] || "").trim().toLowerCase();
  if (pt === "run")  acc.run++;
  if (pt === "pass") acc.pass++;
  if (pt === "rpo")  acc.rpo++;
}

function resolveDown(row) {
  return DOWN_GROUP_PARENT[rowDownGroup(row)] || null;
}

function emptyStats() { return { total: 0, run: 0, pass: 0, rpo: 0, downs: {} }; }

// ── Data computation hooks ────────────────────────────────────────────────────
function usePersonnelEntries(rows) {
  return useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const map = {};
    offense.forEach(r => {
      const pers = String(r["PERSONNEL"] || "").trim() || "—";
      const dn   = resolveDown(r);
      if (!map[pers]) map[pers] = { ...emptyStats(), key: pers, label: pers };
      addStats(map[pers], r);
      if (dn) {
        if (!map[pers].downs[dn]) map[pers].downs[dn] = { total: 0, run: 0, pass: 0, rpo: 0 };
        addStats(map[pers].downs[dn], r);
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);
}

function useFormBackEntries(rows) {
  return useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const map = {};
    offense.forEach(r => {
      const form = String(r["OFF FORM"]  || "").trim() || "—";
      const back = String(r["BACKFIELD"] || "").trim() || "—";
      const key  = `${form}|||${back}`;
      const dn   = resolveDown(r);
      const parts = [form, back].filter(x => x && x !== "—");
      const label = parts.join(" ") || "—";
      if (!map[key]) map[key] = { ...emptyStats(), key, label };
      addStats(map[key], r);
      if (dn) {
        if (!map[key].downs[dn]) map[key].downs[dn] = { total: 0, run: 0, pass: 0, rpo: 0 };
        addStats(map[key].downs[dn], r);
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [rows]);
}

// ── TendencyRow ───────────────────────────────────────────────────────────────
function TendencyRow({ entry, onRemove }) {
  const [activeDown, setActiveDown] = useState(null);

  const display = activeDown && entry.downs[activeDown]
    ? entry.downs[activeDown]
    : { total: entry.total, run: entry.run, pass: entry.pass, rpo: entry.rpo || 0 };

  const pPct   = pctInt(display.pass, display.total);
  const rPct   = pctInt(display.run,  display.total);
  const rpoPct = pctInt(display.rpo || 0, display.total);

  const availableDowns = DOWN_SIMPLE.filter(d => entry.downs[d]?.total > 0);

  return (
    <div style={{
      background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "14px 16px", marginBottom: 12, position: "relative",
    }}>
      {onRemove && (
        <button onClick={onRemove} style={{
          position: "absolute", top: 8, right: 8,
          background: "none", border: "none", color: "var(--text3)",
          cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 2,
        }}>×</button>
      )}

      {/* Label + total */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: "var(--text)", fontSize: "clamp(14px, 1.4vw, 18px)", fontWeight: 800,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          paddingRight: onRemove ? 20 : 0 }}>
          {entry.label}
        </div>
        <div style={{ color: "var(--text3)", fontSize: "clamp(10px, 1vw, 13px)", marginTop: 2 }}>
          {display.total} plays
        </div>
      </div>

      {/* Tall stacked bar */}
      <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden",
        marginBottom: 12, gap: 1 }}>
        <div style={{ flex: Math.max(1, pPct), background: PASS_COLOR }} />
        {rpoPct > 0 && <div style={{ flex: rpoPct, background: RPO_COLOR }} />}
        <div style={{ flex: Math.max(1, rPct), background: RUN_COLOR }} />
      </div>

      {/* Big pct block — font scales with segment width */}
      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden",
        border: "1px solid var(--border)", marginBottom: 10 }}>
        {[
          { pct: pPct,   color: PASS_COLOR, bg: `rgba(var(--pass-rgb),.12)`, label: "Pass" },
          { pct: rPct,   color: RUN_COLOR,  bg: `rgba(var(--run-rgb),.12)`,  label: "Run"  },
          ...(rpoPct > 0 ? [{ pct: rpoPct, color: RPO_COLOR, bg: "rgba(212,120,42,.12)", label: "RPO" }] : []),
        ].map(({ pct: p, color, bg, label }, i, arr) => (
          <div key={label} style={{
            flex: Math.max(p, 5), background: bg,
            padding: "10px 4px", textAlign: "center",
            borderLeft: i > 0 ? "1px solid var(--border)" : "none",
            overflow: "hidden", minWidth: 0,
          }}>
            <div style={{
              color,
              fontSize: `clamp(9px, ${Math.min(p * 0.055, 2.6)}vw, 40px)`,
              fontWeight: 800, lineHeight: 1,
              whiteSpace: "nowrap", overflow: "hidden",
            }}>
              {p}%
            </div>
            <div style={{ color: "var(--text3)", fontSize: `clamp(7px, ${Math.min(p * 0.02, 0.9)}vw, 10px)`,
              marginTop: 3, textTransform: "uppercase", letterSpacing: .5 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Down filter buttons */}
      {availableDowns.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {availableDowns.map(d => {
            const ds = entry.downs[d];
            const dp = pctInt(ds.pass, ds.total);
            const dr = pctInt(ds.run,  ds.total);
            const isActive = activeDown === d;
            return (
              <button key={d} onClick={() => setActiveDown(isActive ? null : d)}
                style={{
                  background: isActive ? "var(--accent)" : "var(--surface2)",
                  color: isActive ? "#000" : "var(--text2)",
                  border: isActive ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: 6, padding: "4px 10px",
                  fontSize: "clamp(9px, 0.9vw, 12px)", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}>
                {/* Mini bar */}
                <span style={{ display: "inline-flex", height: 8, width: 28,
                  borderRadius: 2, overflow: "hidden", gap: 0 }}>
                  <span style={{ flex: dp, background: PASS_COLOR }} />
                  <span style={{ flex: dr, background: RUN_COLOR }} />
                </span>
                {d} · {ds.total}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TendencyPanel ─────────────────────────────────────────────────────────────
function TendencyPanel({ title, entries }) {
  const hot    = entries.slice(0, 5);
  const more   = entries.slice(5);
  const [active, setActive] = useState(() => new Set(hot.slice(0,1).map(e => e.key)));
  const [showMore, setShowMore] = useState(false);
  const [moreKey, setMoreKey]   = useState(null);

  // Reset active when entries change
  useEffect(() => {
    if (entries.length > 0) setActive(new Set([entries[0].key]));
  }, [entries.map(e => e.key).join(",")]);

  function toggleActive(key) {
    setActive(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return next; // minimum 1
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectMore(key) {
    setActive(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setMoreKey(null);
    setShowMore(false);
  }

  function dominantColor(entry) {
    const pPct = pctInt(entry.pass, entry.total);
    const rPct = pctInt(entry.run,  entry.total);
    if (pPct > rPct) return PASS_COLOR;
    return RUN_COLOR;
  }

  const activeEntries = entries.filter(e => active.has(e.key));

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "20px 24px",
    }}>
      {/* Title */}
      <h2 style={{ fontSize: "clamp(16px, 1.8vw, 24px)", fontWeight: 800,
        color: "var(--text)", margin: "0 0 16px", letterSpacing: -.3 }}>
        {title}
      </h2>

      {/* Hot buttons + More dropdown */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20,
        alignItems: "center" }}>
        {hot.map(e => {
          const isAct = active.has(e.key);
          const color = dominantColor(e);
          return (
            <button key={e.key} onClick={() => toggleActive(e.key)}
              style={{
                background: isAct ? "var(--surface2)" : "var(--bg)",
                color: isAct ? "var(--text)" : "var(--text3)",
                border: isAct ? `2px solid ${color}` : "2px solid var(--border)",
                borderRadius: 8, padding: "6px 14px",
                fontSize: "clamp(11px, 1vw, 14px)", fontWeight: isAct ? 700 : 500,
                cursor: "pointer", transition: "all .15s",
                whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
              {e.label}
            </button>
          );
        })}

        {more.length > 0 && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowMore(v => !v)}
              style={{
                background: "var(--surface2)", color: "var(--text3)",
                border: "2px solid var(--border)", borderRadius: 8,
                padding: "6px 14px",
                fontSize: "clamp(11px, 1vw, 14px)", fontWeight: 500,
                cursor: "pointer",
              }}>
              ＋ More ({more.length})
            </button>
            {showMore && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, minWidth: 180, boxShadow: "0 4px 20px rgba(0,0,0,.3)",
                maxHeight: 240, overflowY: "auto",
              }}>
                {more.map(e => (
                  <button key={e.key} onClick={() => selectMore(e.key)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: active.has(e.key) ? "rgba(92,191,138,.1)" : "transparent",
                      color: "var(--text2)", border: "none",
                      padding: "8px 14px",
                      fontSize: "clamp(11px, 1vw, 13px)", fontWeight: 500,
                      cursor: "pointer",
                    }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "rgba(92,191,138,.08)"}
                    onMouseLeave={ev => ev.currentTarget.style.background = active.has(e.key) ? "rgba(92,191,138,.1)" : "transparent"}
                  >
                    {e.label}
                    <span style={{ color: "var(--text3)", marginLeft: 6, fontSize: 11 }}>
                      {e.total} plays
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active entry rows */}
      {activeEntries.length === 0 && (
        <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No data.</p>
      )}
      {activeEntries.map(e => (
        <TendencyRow key={e.key} entry={e}
          onRemove={activeEntries.length > 1 ? () => toggleActive(e.key) : undefined}
        />
      ))}
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
  const [selFP,    setSelFP]    = useState("All");

  const driveOptions = useMemo(() => {
    if (mode !== "live") return [];
    const seen = new Set();
    rows.forEach(r => { const d = String(r["DRIVE"] || "").trim(); if (d) seen.add(d); });
    return [...seen].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }, [rows, mode]);

  const fpOptions = useMemo(() => {
    if (mode !== "live") return [];
    const seen = new Set(rows.map(r => String(r["FP GROUP"] || "").trim()).filter(Boolean));
    return FP_ZONES.filter(z => seen.has(z));
  }, [rows, mode]);

  const filteredRows = useMemo(() => {
    if (mode !== "live") return rows;
    return rows.filter(r => {
      if (selDrive !== "All" && String(r["DRIVE"] || "").trim() !== selDrive) return false;
      if (selFP    !== "All" && String(r["FP GROUP"] || "").trim() !== selFP) return false;
      return true;
    });
  }, [rows, mode, selDrive, selFP]);

  const stats          = useMemo(() => computePlaytypeStats(filteredRows), [filteredRows]);
  const personnelData  = usePersonnelEntries(filteredRows);
  const formBackData   = useFormBackEntries(filteredRows);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
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

        {mode === "live" && (driveOptions.length > 0 || fpOptions.length > 0) && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            {driveOptions.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            {fpOptions.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--text3)", fontSize: 12 }}>Field Position</span>
                <select value={selFP} onChange={e => setSelFP(e.target.value)}
                  style={{
                    background: "var(--surface)", color: "var(--text2)",
                    border: "1px solid var(--border)", borderRadius: 6,
                    padding: "6px 10px", fontSize: 13, outline: "none", cursor: "pointer",
                  }}>
                  <option value="All">All</option>
                  {fpOptions.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            )}
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
          {/* ── PREP mode ── */}
          {mode !== "live" && (
            <>
              {/* Stat cards */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
                <StatCard label="Offense Plays" value={stats.total} />
                <StatCard label="Run"  value={stats.run}  sub={`${stats.runPct}%`}  color={RUN_COLOR} />
                <StatCard label="Pass" value={stats.pass} sub={`${stats.passPct}%`} color={PASS_COLOR} />
                {stats.rpo > 0 && (
                  <StatCard label="RPO" value={stats.rpo} sub={`${stats.rpoPct}%`} color={RPO_COLOR} />
                )}
              </div>

              {/* D&D + Run/Pass bar */}
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
            </>
          )}

          {/* ── LIVE mode ── */}
          {mode === "live" && (
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start",
              flexWrap: "wrap" }}>
              <TendencyPanel title="Tendency by Personnel" entries={personnelData} />
              <TendencyPanel title="Tendency by Formation + Backfield" entries={formBackData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Micro-components ──────────────────────────────────────────────────────────
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

// Export shared components for GameOverview
export { TendencyPanel, TendencyRow };
