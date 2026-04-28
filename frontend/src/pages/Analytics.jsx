import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { useFetch } from "../hooks/useFetch";

// ── constants ────────────────────────────────────────────────────────────────
const CHART_BG   = "#131820";
const GRID_COLOR = "#1f2937";
const TEXT_COLOR = "#9ca3af";

const PERSONNEL_COLORS = [
  "#00c3ff","#ff6b35","#10b981","#f59e0b","#7c3aed","#f87171","#34d399","#fb923c",
];

// formation name → image filename (no extension required)
const FORMATION_IMAGES = {
  "TRIO":    "trio gf.jpg",
  "DOUBLES": "doubles gf.jpg",
  "OPEN":    "open sg.jpg",
};

// ── helpers ──────────────────────────────────────────────────────────────────
const TAB_LABELS = ["Down & Distance", "Formations", "Personnel"];

function TabBar({ active, onChange }) {
  return (
    <div className="tab-bar">
      {TAB_LABELS.map((t, i) => (
        <button
          key={t}
          className={`tab-btn${active === i ? " tab-btn--active" : ""}`}
          onClick={() => onChange(i)}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Down & Distance ──────────────────────────────────────────────────────────
function DownDistanceTable({ rows }) {
  if (!rows || rows.length === 0)
    return <p className="no-data">Keine Daten verfügbar.</p>;

  return (
    <div className="dd-table-wrap">
      <table className="dd-table">
        <thead>
          <tr>
            <th>Down & Distance</th>
            <th>Run</th>
            <th>Pass</th>
            <th>Total</th>
            <th>Run %</th>
            <th>Pass %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.down_group}>
              <td className="dd-label">{r.down_group}</td>
              <td>{r.run}</td>
              <td>{r.pass_}</td>
              <td>{r.total}</td>
              <td>
                <span className={`pct-badge${r.run_pct >= 70 ? " pct-badge--run" : ""}`}>
                  {r.run_pct}%
                </span>
              </td>
              <td>
                <span className={`pct-badge${r.pass_pct >= 70 ? " pct-badge--pass" : ""}`}>
                  {r.pass_pct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="dd-chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 32, bottom: 0, left: 140 }}
          >
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: TEXT_COLOR, fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="down_group"
              tick={{ fill: TEXT_COLOR, fontSize: 11 }}
              width={136}
            />
            <Tooltip
              contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
              labelStyle={{ color: "#f0f4f8" }}
              formatter={(v, name) => [`${v}%`, name]}
            />
            <Legend wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }} />
            <Bar dataKey="run_pct"  name="Run %"  fill="#10b981" radius={[0, 4, 4, 0]} stackId="a" />
            <Bar dataKey="pass_pct" name="Pass %" fill="#00c3ff" radius={[0, 4, 4, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Formations ───────────────────────────────────────────────────────────────
function FormationCard({ formation, rank }) {
  const img = FORMATION_IMAGES[formation.name];
  return (
    <div className="form-card">
      <div className="form-card__rank">#{rank}</div>
      {img ? (
        <img
          src={`/formations/${img}`}
          alt={formation.name}
          className="form-card__img"
        />
      ) : (
        <div className="form-card__no-img">{formation.name[0]}</div>
      )}
      <div className="form-card__body">
        <div className="form-card__name">{formation.name}</div>
        <div className="form-card__count">{formation.count} Plays</div>
      </div>
    </div>
  );
}

function FormationsTab({ formations }) {
  const [selected, setSelected] = useState(formations[0]?.name ?? "");
  if (!formations || formations.length === 0)
    return <p className="no-data">Keine Daten verfügbar.</p>;

  const top3 = formations.slice(0, 3);
  const total = formations.reduce((s, f) => s + f.count, 0);

  const detail = formations.find((f) => f.name === selected);

  return (
    <div className="form-tab">
      <h3 className="section-label">Top 3 Formations</h3>
      <div className="form-cards-row">
        {top3.map((f, i) => (
          <FormationCard key={f.name} formation={f} rank={i + 1} />
        ))}
      </div>

      <h3 className="section-label" style={{ marginTop: "2rem" }}>Alle Formations</h3>
      <div className="form-detail-row">
        <select
          className="game-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {formations.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name} ({f.count} Plays)
            </option>
          ))}
        </select>

        {detail && (
          <div className="form-detail">
            {FORMATION_IMAGES[detail.name] ? (
              <img
                src={`/formations/${FORMATION_IMAGES[detail.name]}`}
                alt={detail.name}
                className="form-detail__img"
              />
            ) : (
              <div className="form-detail__no-img">{detail.name}</div>
            )}
            <div className="form-detail__stats">
              <div className="stat-pill">
                <span className="stat-pill__label">Plays</span>
                <span className="stat-pill__value">{detail.count}</span>
              </div>
              <div className="stat-pill">
                <span className="stat-pill__label">Anteil</span>
                <span className="stat-pill__value">{Math.round(detail.count / total * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bar chart all formations */}
      <div style={{ marginTop: "1.5rem" }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={formations.slice(0, 12)}
            margin={{ top: 4, right: 16, bottom: 48, left: 0 }}
          >
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
            <XAxis
              dataKey="name"
              tick={{ fill: TEXT_COLOR, fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: TEXT_COLOR, fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
              labelStyle={{ color: "#f0f4f8" }}
              itemStyle={{ color: "#00c3ff" }}
            />
            <Bar dataKey="count" name="Plays" fill="#00c3ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Personnel ────────────────────────────────────────────────────────────────
const CUSTOM_PIE_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600}>
      {`${name}\n${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function PersonnelTab({ personnel }) {
  if (!personnel || personnel.length === 0)
    return <p className="no-data">Keine Daten verfügbar.</p>;

  const total = personnel.reduce((s, p) => s + p.count, 0);

  // Rename for display
  const PERS_LABELS = {
    "10": "10 (1 RB, 0 TE, 4 WR)",
    "11": "11 (1 RB, 1 TE, 3 WR)",
    "12": "12 (1 RB, 2 TE, 2 WR)",
    "20": "20 (2 RB, 0 TE, 3 WR)",
    "21": "21 (2 RB, 1 TE, 2 WR)",
    "0":  "00 (0 RB, 0 TE, 5 WR)",
    "13E": "13E (1 RB, 3 TE, 1 WR)",
  };

  const pieData = personnel.map((p) => ({
    name: p.name,
    value: p.count,
    label: PERS_LABELS[p.name] ?? p.name,
  }));

  return (
    <div className="pers-tab">
      <div className="pers-layout">
        <div className="pers-pie-wrap">
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={130}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  percent >= 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
                }
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PERSONNEL_COLORS[i % PERSONNEL_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
                labelStyle={{ color: "#f0f4f8" }}
                formatter={(v, name) => [
                  `${v} Plays (${Math.round(v / total * 100)}%)`,
                  PERS_LABELS[name] ?? name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="pers-legend">
          <h3 className="section-label">Personnel Packages</h3>
          {personnel.map((p, i) => (
            <div key={p.name} className="pers-row">
              <span
                className="pers-dot"
                style={{ background: PERSONNEL_COLORS[i % PERSONNEL_COLORS.length] }}
              />
              <span className="pers-name">{PERS_LABELS[p.name] ?? p.name}</span>
              <span className="pers-count">{p.count} Plays</span>
              <span className="pers-pct">{Math.round(p.count / total * 100)}%</span>
            </div>
          ))}
          <div className="pers-total">
            <span>Gesamt</span>
            <span>{total} Plays</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const { data: allGames, loading, error } = useFetch("/api/playdata");
  const [gameIdx, setGameIdx] = useState(0);
  const [tab, setTab]         = useState(0);

  const game = useMemo(() => allGames?.[gameIdx] ?? null, [allGames, gameIdx]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Opponent Scout</h1>
          <p className="page-sub">Lade Daten…</p>
        </div>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  if (error || !allGames) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Opponent Scout</h1>
          <p className="page-sub" style={{ color: "#f87171" }}>Fehler beim Laden der Daten.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Opponent Scout</h1>
        <p className="page-sub">Play-by-Play Analyse · Down &amp; Distance · Formations · Personnel</p>
      </div>

      {/* Game selector */}
      <div className="scout-controls">
        <label className="scout-label">Spiel auswählen</label>
        <select
          className="game-select"
          value={gameIdx}
          onChange={(e) => { setGameIdx(Number(e.target.value)); setTab(0); }}
        >
          {allGames.map((g, i) => (
            <option key={i} value={i}>{g.game}</option>
          ))}
        </select>
        {game && (
          <span className="scout-badge">{game.total_plays} Offense Plays</span>
        )}
      </div>

      {/* Tabs */}
      <TabBar active={tab} onChange={setTab} />

      {/* Tab content */}
      <div className="tab-content">
        {tab === 0 && game && <DownDistanceTable rows={game.down_distance} />}
        {tab === 1 && game && <FormationsTab formations={game.formations} />}
        {tab === 2 && game && <PersonnelTab personnel={game.personnel} />}
      </div>
    </div>
  );
}
