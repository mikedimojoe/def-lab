import { useMemo, useState, useEffect } from "react";
import { useApp }  from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { computePlaytypeStats } from "../lib/dataEngine";
import DDTable   from "../components/DDTable";
import { LiveCallsheet } from "./Callsheet";

const ACCENT     = "#5CBF8A";
const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#D4782A";

// ── Personnel DD Widget (same logic as GameOverview) ─────────────────────────
function PersonnelDDWidget({ rows }) {
  const offense = useMemo(() => rows, [rows]);

  const allPersonnel = useMemo(() => {
    const map = {};
    offense.forEach(r => {
      const p = String(r["PERSONNEL"] || "").trim() || "—";
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ key: label, label, count }));
  }, [offense]);

  const [selected, setSelected] = useState(new Set());
  const [extra,    setExtra]    = useState("");

  useEffect(() => {
    if (allPersonnel.length > 0 && selected.size === 0) {
      setSelected(new Set([allPersonnel[0].key]));
    }
  }, [allPersonnel.map(p => p.key).join(",")]); // eslint-disable-line

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addExtra(key) {
    if (key) { setSelected(prev => new Set([...prev, key])); setExtra(""); }
  }

  const top5 = allPersonnel.slice(0, 5);
  const more  = allPersonnel.slice(5);

  const tableData = useMemo(() => {
    return [...selected].map(key => {
      const filtered = offense.filter(r => (String(r["PERSONNEL"] || "").trim() || "—") === key);
      const stats    = computePlaytypeStats(filtered);
      const entry    = allPersonnel.find(p => p.key === key);
      return { key, label: key, total: entry?.count || 0, tableRows: stats.tableRows,
        runPct: stats.runPct, passPct: stats.passPct, rpoPct: stats.rpoPct };
    });
  }, [offense, [...selected].sort().join(","), allPersonnel]); // eslint-disable-line

  if (!allPersonnel.length)
    return <p style={{ color: "var(--text3)", fontSize: 13 }}>No personnel data.</p>;

  return (
    <div>
      {/* Selector buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {top5.map(p => {
          const active = selected.has(p.key);
          return (
            <button key={p.key} onClick={() => toggle(p.key)} style={{
              background: active ? "rgba(92,191,138,.15)" : "var(--bg)",
              color: active ? "var(--text)" : "var(--text3)",
              border: `2px solid ${active ? ACCENT : "var(--border)"}`,
              borderRadius: 8, padding: "5px 12px",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              transition: "all .15s", display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{p.label}</span>
              <span style={{ color: "var(--text3)", fontWeight: 400, fontSize: "0.85em" }}>{p.count}</span>
            </button>
          );
        })}
        {more.length > 0 && (
          <select value={extra} onChange={e => addExtra(e.target.value)}
            style={{
              background: "var(--bg)", color: "var(--text2)",
              border: "1px solid var(--border)", borderRadius: 8,
              padding: "5px 10px", fontSize: 13, cursor: "pointer", outline: "none",
            }}>
            <option value="">＋ More</option>
            {more.map(p => <option key={p.key} value={p.key}>{p.label} ({p.count})</option>)}
          </select>
        )}
      </div>

      {/* Tables side by side */}
      {selected.size === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13 }}>Select a personnel above.</p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${tableData.length}, 1fr)`,
          gap: 16, alignItems: "flex-start", width: "100%",
        }}>
          {tableData.map(({ key, label, total, tableRows, runPct, passPct, rpoPct }) => (
            <div key={key} style={{ minWidth: 0 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: ACCENT, fontSize: 13, fontWeight: 800 }}>{label}</span>
                <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 6 }}>
                  {total} plays ·{" "}
                  <span style={{ color: RUN_COLOR,  fontWeight: 700 }}>{runPct}% R</span>
                  {" / "}
                  <span style={{ color: PASS_COLOR, fontWeight: 700 }}>{passPct}% P</span>
                  {rpoPct > 0 && <>{" / "}<span style={{ color: RPO_COLOR, fontWeight: 700 }}>{rpoPct}% RPO</span></>}
                </span>
              </div>
              <DDTable rows={tableRows} showRPO={rpoPct > 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CallsheetTest() {
  const { selectedGame, liveRows } = useApp();
  const { user } = useAuth();
  const noData = !selectedGame || liveRows.length === 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>
          Callsheet — Live
        </h2>
        <span style={{
          background: "rgba(92,191,138,.12)", color: ACCENT,
          fontSize: 10, padding: "2px 8px", borderRadius: 8,
          border: "1px solid rgba(92,191,138,.2)", fontWeight: 700,
        }}>TEST</span>
      </div>
      <p style={{ color: "var(--text3)", fontSize: 13, margin: "0 0 16px" }}>
        Live situational tendencies + Tendency by Personnel (multiple sets side by side).
      </p>

      {noData ? (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 48, textAlign: "center", color: "var(--text3)",
          fontSize: 14, marginTop: 24,
        }}>
          {!selectedGame ? "Select a game from the sidebar." : "No live data yet."}
        </div>
      ) : (
        <>
          {/* ── Tendency by Personnel ── */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "16px 20px", marginBottom: 8,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 14 }}>
              Tendency by Personnel
            </div>
            <PersonnelDDWidget rows={liveRows} />
          </div>

          {/* ── Full Live Callsheet (2nd Down als Tiles mit Personnel) ── */}
          <LiveCallsheet rows={liveRows} d2Mode="tiles" />
        </>
      )}
    </div>
  );
}
