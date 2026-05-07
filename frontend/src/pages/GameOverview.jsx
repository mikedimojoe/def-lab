import { useMemo, useState, useEffect } from "react";
import { useApp }   from "../contexts/AppContext";
import { useAuth }  from "../contexts/AuthContext";
import { apiSaveUserSettings } from "../lib/api";
import {
  computePlaytypeStats,
  rowDownGroup, DOWN_GROUP_PARENT,
} from "../lib/dataEngine";
import DDTable    from "../components/DDTable";
import RunPassBar from "../components/RunPassBar";
import { TendencyPanel } from "./Overview";

const ACCENT = "#5CBF8A";

const RUN_COLOR  = "var(--run-color)";
const PASS_COLOR = "var(--pass-color)";
const RPO_COLOR  = "#D4782A";
const DOWN_SIMPLE = ["1st", "2nd", "3rd", "4th"];

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

// ── Widget definitions ────────────────────────────────────────────────────────
const WIDGET_DEFS = [
  { id: "rpr",           title: "Run / Pass / RPO",           defaultActive: true  },
  { id: "personnel",     title: "Tendency by Personnel",      defaultActive: true  },
  { id: "formation",     title: "Tendency by Formation + BF", defaultActive: true  },
  { id: "third_down",    title: "3rd Down Matrix",            defaultActive: false },
  { id: "red_zone",      title: "Red Zone Split",             defaultActive: false },
  { id: "dd_table",      title: "Down & Distance",            defaultActive: false },
  { id: "play_by_down",  title: "Play Type by Down",          defaultActive: false },
  { id: "top_formations","title": "Top Formations",           defaultActive: false },
];

const CONFIG_KEY = "dl_game_overview_config";

function defaultConfig() {
  return WIDGET_DEFS.map(w => ({ id: w.id, active: w.defaultActive }));
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return defaultConfig();
    const saved = JSON.parse(raw);
    // Merge: keep order from saved, add new widgets at end
    const ids = new Set(saved.map(x => x.id));
    const merged = [
      ...saved.filter(x => WIDGET_DEFS.find(w => w.id === x.id)),
      ...WIDGET_DEFS.filter(w => !ids.has(w.id)).map(w => ({ id: w.id, active: w.defaultActive })),
    ];
    return merged;
  } catch {
    return defaultConfig();
  }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  apiSaveUserSettings({ game_overview_config: JSON.stringify(config) }).catch(() => {});
}

// ── DashCard ──────────────────────────────────────────────────────────────────
function DashCard({ title, children }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "20px 24px", marginBottom: 20,
    }}>
      <h3 style={{
        fontSize: "clamp(15px, 1.6vw, 22px)", fontWeight: 800,
        color: "var(--text)", margin: "0 0 16px", letterSpacing: -.3,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ── Data hooks ────────────────────────────────────────────────────────────────
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

// ── Widget: Personnel D&D table ───────────────────────────────────────────────
function PersonnelDDWidget({ rows }) {
  const offense = useMemo(() => rows.filter(r => r["ODK"] === "O"), [rows]);

  // Build personnel list sorted by frequency
  const allPersonnel = useMemo(() => {
    const map = {};
    offense.forEach(r => {
      const p = String(r["PERSONNEL"] || "").trim() || "—";
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ key: label, label, count }));
  }, [offense]);

  const [selected, setSelected] = useState(new Set());
  const [extra, setExtra]       = useState("");

  // Auto-select top 1 on first load
  useEffect(() => {
    if (allPersonnel.length > 0 && selected.size === 0) {
      setSelected(new Set([allPersonnel[0].key]));
    }
  }, [allPersonnel.map(p => p.key).join(",")]); // eslint-disable-line

  function toggle(key) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); // allow all-deselected
      else next.add(key);
      return next;
    });
  }

  function addExtra(key) {
    if (key) { setSelected(prev => new Set([...prev, key])); setExtra(""); }
  }

  const top5 = allPersonnel.slice(0, 5);
  const more  = allPersonnel.slice(5);

  // Compute DDTable rows for each selected personnel
  const tableData = useMemo(() => {
    return [...selected].map(key => {
      const filtered = offense.filter(r => (String(r["PERSONNEL"] || "").trim() || "—") === key);
      const stats    = computePlaytypeStats(filtered);
      const entry    = allPersonnel.find(p => p.key === key);
      return { key, label: key, total: entry?.count || 0, tableRows: stats.tableRows,
        runPct: stats.runPct, passPct: stats.passPct, rpoPct: stats.rpoPct, rpo: stats.rpo };
    });
  }, [offense, [...selected].sort().join(","), allPersonnel]); // eslint-disable-line

  if (!allPersonnel.length)
    return <p style={{ color: "var(--text3)", fontSize: 13 }}>No personnel data.</p>;

  return (
    <div>
      {/* Hot buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {top5.map(p => {
          const active = selected.has(p.key);
          return (
            <button key={p.key} onClick={() => toggle(p.key)} style={{
              background: active ? "rgba(92,191,138,.15)" : "var(--bg)",
              color: active ? "var(--text)" : "var(--text3)",
              border: `2px solid ${active ? ACCENT : "var(--border)"}`,
              borderRadius: 8, padding: "5px 12px",
              fontSize: "clamp(11px,1vw,14px)", fontWeight: 700, cursor: "pointer",
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
          {tableData.map(({ key, label, total, tableRows, runPct, passPct, rpoPct, rpo }) => (
            <div key={key} style={{ minWidth: 0 }}>
              {/* Personnel header */}
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: ACCENT, fontSize: 13, fontWeight: 800 }}>{label}</span>
                <span style={{ color: "var(--text3)", fontSize: 11, marginLeft: 6 }}>
                  {total} plays ·{" "}
                  <span style={{ color: RUN_COLOR, fontWeight: 700 }}>{runPct}% R</span>
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

// ── Widget: RPR stat cards ────────────────────────────────────────────────────
function RprWidget({ rows }) {
  const stats = useMemo(() => computePlaytypeStats(rows), [rows]);
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <StatBox label="Offense Plays" value={stats.total} />
      <StatBox label="Run"  value={stats.run}  sub={`${stats.runPct}%`}  color={RUN_COLOR} />
      <StatBox label="Pass" value={stats.pass} sub={`${stats.passPct}%`} color={PASS_COLOR} />
      {stats.rpo > 0 && (
        <StatBox label="RPO" value={stats.rpo} sub={`${stats.rpoPct}%`} color={RPO_COLOR} />
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{
      background: "var(--bg)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "14px 20px", flex: 1, minWidth: 110,
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

// ── Widget: 3rd Down Matrix ───────────────────────────────────────────────────
function ThirdDownWidget({ rows }) {
  const data = useMemo(() => {
    const buckets = [
      { label: "3rd & 1-2", min: 1, max: 2 },
      { label: "3rd & 3-4", min: 3, max: 4 },
      { label: "3rd & 5-7", min: 5, max: 7 },
      { label: "3rd & 8+",  min: 8, max: 99 },
    ];
    const offense = rows.filter(r => r["ODK"] === "O");
    return buckets.map(b => {
      const bucket = offense.filter(r => {
        const dn   = parseInt(r["DN"] || r["DOWN"] || 0);
        const dist = parseInt(r["DIST"] || r["DISTANCE"] || 0);
        return dn === 3 && dist >= b.min && dist <= b.max;
      });
      if (!bucket.length) return null;
      const run  = bucket.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "run").length;
      const pass = bucket.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "pass").length;
      return {
        label: b.label,
        total: bucket.length,
        runPct:  pctInt(run,  bucket.length),
        passPct: pctInt(pass, bucket.length),
      };
    }).filter(Boolean);
  }, [rows]);

  if (!data.length)
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No 3rd down data.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Situation", "Plays", "Run%", "Pass%"].map(h => (
            <th key={h} style={{ color: "var(--text3)", fontSize: 11,
              textAlign: "left", padding: "6px 10px",
              textTransform: "uppercase", letterSpacing: .6,
              borderBottom: "1px solid var(--border)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.label}>
            <td style={{ color: "var(--text2)", fontSize: 13, padding: "8px 10px",
              borderBottom: "1px solid var(--border)" }}>{row.label}</td>
            <td style={{ color: "var(--text3)", fontSize: 13, padding: "8px 10px",
              borderBottom: "1px solid var(--border)" }}>{row.total}</td>
            <td style={{ color: RUN_COLOR,  fontSize: 13, fontWeight: 700,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.runPct}%</td>
            <td style={{ color: PASS_COLOR, fontSize: 13, fontWeight: 700,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.passPct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Widget: Red Zone Split ────────────────────────────────────────────────────
function RedZoneWidget({ rows }) {
  const data = useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    function zoneStats(fpGroup) {
      const zone = offense.filter(r =>
        String(r["FP GROUP"] || "").trim().toUpperCase() === fpGroup
      );
      if (!zone.length) return null;
      const run  = zone.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "run").length;
      const pass = zone.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "pass").length;
      // Top formation
      const formMap = {};
      zone.forEach(r => {
        const f = String(r["OFF FORM"] || "").trim();
        if (f) formMap[f] = (formMap[f] || 0) + 1;
      });
      const topForm = Object.entries(formMap).sort((a,b) => b[1]-a[1])[0]?.[0] || "—";
      // Top play
      const playMap = {};
      zone.forEach(r => {
        const p = String(r["PLAY"] || r["PLAY NAME"] || "").trim();
        if (p) playMap[p] = (playMap[p] || 0) + 1;
      });
      const topPlay = Object.entries(playMap).sort((a,b) => b[1]-a[1])[0]?.[0] || "—";
      return {
        total: zone.length,
        runPct:  pctInt(run, zone.length),
        passPct: pctInt(pass, zone.length),
        topForm,
        topPlay,
      };
    }
    return {
      high: zoneStats("HIGH REDZONE"),
      low:  zoneStats("LOW REDZONE"),
    };
  }, [rows]);

  if (!data.high && !data.low)
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No red zone data.</p>;

  function Box({ label, s }) {
    if (!s) return (
      <div style={{ flex: 1, minWidth: 180, background: "var(--bg)",
        border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ color: "var(--text3)", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{label}</div>
        <p style={{ color: "var(--text3)", fontSize: 12, margin: 0 }}>No data</p>
      </div>
    );
    return (
      <div style={{ flex: 1, minWidth: 180, background: "var(--bg)",
        border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{label}</div>
        <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 4 }}>{s.total} plays</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          <span style={{ color: RUN_COLOR,  fontWeight: 700, fontSize: 14 }}>R {s.runPct}%</span>
          <span style={{ color: PASS_COLOR, fontWeight: 700, fontSize: 14 }}>P {s.passPct}%</span>
        </div>
        <div style={{ color: "var(--text3)", fontSize: 11 }}>
          Top Form: <span style={{ color: "var(--text2)", fontWeight: 600 }}>{s.topForm}</span>
        </div>
        <div style={{ color: "var(--text3)", fontSize: 11, marginTop: 2 }}>
          Top Play: <span style={{ color: "var(--text2)", fontWeight: 600 }}>{s.topPlay}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Box label="High Red Zone" s={data.high} />
      <Box label="Low Red Zone"  s={data.low} />
    </div>
  );
}

// ── Widget: Play by Down ──────────────────────────────────────────────────────
function PlayByDownWidget({ rows }) {
  const data = useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    return DOWN_SIMPLE.map(d => {
      const dRows = offense.filter(r => resolveDown(r) === d);
      if (!dRows.length) return null;
      const run  = dRows.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "run").length;
      const pass = dRows.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "pass").length;
      const rpo  = dRows.filter(r => String(r["PLAY TYPE"] || "").toLowerCase() === "rpo").length;
      return {
        down: d,
        total: dRows.length,
        runPct:  pctInt(run,  dRows.length),
        passPct: pctInt(pass, dRows.length),
        rpoPct:  pctInt(rpo,  dRows.length),
      };
    }).filter(Boolean);
  }, [rows]);

  if (!data.length)
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No down data.</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Down", "Plays", "R%", "P%", "RPO%"].map(h => (
            <th key={h} style={{ color: "var(--text3)", fontSize: 11,
              textAlign: "left", padding: "6px 10px",
              textTransform: "uppercase", letterSpacing: .6,
              borderBottom: "1px solid var(--border)" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.down}>
            <td style={{ color: "var(--text)", fontSize: 13, fontWeight: 700,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.down}</td>
            <td style={{ color: "var(--text3)", fontSize: 13,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.total}</td>
            <td style={{ color: RUN_COLOR,  fontSize: 13, fontWeight: 700,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.runPct}%</td>
            <td style={{ color: PASS_COLOR, fontSize: 13, fontWeight: 700,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.passPct}%</td>
            <td style={{ color: RPO_COLOR,  fontSize: 13, fontWeight: 700,
              padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{row.rpoPct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Widget: Top Formations bar list ───────────────────────────────────────────
function TopFormationsWidget({ rows }) {
  const data = useMemo(() => {
    const offense = rows.filter(r => r["ODK"] === "O");
    const total   = offense.length;
    const map = {};
    offense.forEach(r => {
      const f = String(r["OFF FORM"] || "").trim();
      if (f) map[f] = (map[f] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, pct: pctInt(count, total) }));
  }, [rows]);

  if (!data.length)
    return <p style={{ color: "var(--text3)", fontSize: 13, margin: 0 }}>No formation data.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map(({ name, count, pct }) => (
        <div key={name}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: "var(--text2)", fontSize: 13, fontWeight: 600 }}>{name}</span>
            <span style={{ color: "var(--text3)", fontSize: 12 }}>{count}× · {pct}%</span>
          </div>
          <div style={{ height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%",
              background: "var(--accent)", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Customize panel ───────────────────────────────────────────────────────────
function CustomizePanel({ config, onChange, onClose }) {
  function toggleWidget(id) {
    const next = config.map(c => c.id === id ? { ...c, active: !c.active } : c);
    onChange(next);
  }

  function moveUp(idx) {
    if (idx === 0) return;
    const next = [...config];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }

  function moveDown(idx) {
    if (idx === config.length - 1) return;
    const next = [...config];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "20px 24px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: "var(--text)", fontSize: 16, fontWeight: 800, margin: 0 }}>
          Customize Dashboard
        </h3>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "var(--text3)",
          cursor: "pointer", fontSize: 18, padding: 4,
        }}>✕</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {config.map((item, idx) => {
          const def = WIDGET_DEFS.find(w => w.id === item.id);
          return (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", borderRadius: 8,
              background: item.active ? "rgba(92,191,138,.08)" : "var(--bg)",
              border: "1px solid var(--border)",
            }}>
              <input type="checkbox" checked={item.active}
                onChange={() => toggleWidget(item.id)}
                style={{ cursor: "pointer", accentColor: "var(--accent)" }} />
              <span style={{ flex: 1, color: item.active ? "var(--text)" : "var(--text3)",
                fontSize: 13, fontWeight: item.active ? 600 : 400 }}>
                {def?.title || item.id}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  style={{ background: "none", border: "none", color: "var(--text3)",
                    cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? .3 : 1,
                    padding: "2px 6px", fontSize: 12 }}>▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === config.length - 1}
                  style={{ background: "none", border: "none", color: "var(--text3)",
                    cursor: idx === config.length - 1 ? "default" : "pointer",
                    opacity: idx === config.length - 1 ? .3 : 1,
                    padding: "2px 6px", fontSize: 12 }}>▼</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GameOverview() {
  const { selectedGame, mode, playRows, liveRows } = useApp();
  const { user } = useAuth();

  const [config,      setConfig]      = useState(() => loadConfig());
  const [customizing, setCustomizing] = useState(false);

  const rows = mode === "live" ? liveRows : playRows;

  const formBackData  = useFormBackEntries(rows);
  const stats         = useMemo(() => computePlaytypeStats(rows), [rows]);

  function handleConfigChange(next) {
    setConfig(next);
    saveConfig(next);
  }

  function renderWidget(id) {
    switch (id) {
      case "rpr":           return <RprWidget rows={rows} />;
      case "personnel":     return <PersonnelDDWidget rows={rows} />;
      case "formation":     return <TendencyPanel title="" entries={formBackData} />;
      case "third_down":    return <ThirdDownWidget rows={rows} />;
      case "red_zone":      return <RedZoneWidget rows={rows} />;
      case "dd_table":      return <DDTable rows={stats.tableRows} />;
      case "play_by_down":  return <PlayByDownWidget rows={rows} />;
      case "top_formations":return <TopFormationsWidget rows={rows} />;
      default:              return null;
    }
  }

  const activeWidgets = config
    .filter(c => c.active)
    .map(c => ({ ...c, def: WIDGET_DEFS.find(w => w.id === c.id) }))
    .filter(c => c.def);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12,
        marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>
            Game Overview
          </h2>
          {user && (
            <p style={{ color: "var(--text3)", fontSize: 13, margin: "4px 0 0" }}>
              {user.displayName || user.username}
              {selectedGame ? ` · W${selectedGame.week} — ${selectedGame.opponent}` : ""}
            </p>
          )}
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setCustomizing(v => !v)} style={{
            background: customizing ? "var(--accent)" : "var(--surface2)",
            color: customizing ? "#000" : "var(--text2)",
            border: "1px solid var(--border)", borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
          }}>
            ✎ Customize
          </button>
        </div>
      </div>

      {/* Customize panel */}
      {customizing && (
        <CustomizePanel
          config={config}
          onChange={handleConfigChange}
          onClose={() => setCustomizing(false)}
        />
      )}

      {!selectedGame ? (
        <EmptyCard>Select a game from the sidebar.</EmptyCard>
      ) : rows.length === 0 ? (
        <EmptyCard>No play data. Upload an .xlsx or start live tagging.</EmptyCard>
      ) : (
        activeWidgets.map(({ id, def }) => (
          <DashCard key={id} title={def.title}>
            {renderWidget(id)}
          </DashCard>
        ))
      )}
    </div>
  );
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
