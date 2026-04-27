import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { useFetch } from "../hooks/useFetch";

const CHART_BG   = "#131820";
const GRID_COLOR = "#1f2937";
const TEXT_COLOR = "#6b7280";

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <p className="chart-sub">{subtitle}</p>}
      </div>
      <div className="chart-body">{children}</div>
    </div>
  );
}

function ScoringByWeek() {
  const { data, loading } = useFetch("/api/stats/scoring-by-week");
  if (loading) return <div className="skeleton" style={{ height: 260 }} />;
  if (!data) return null;
  return (
    <ChartCard title="Punkte pro Woche" subtitle="Ø Punkte pro Spiel je Spielwoche">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
          <XAxis dataKey="week" tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <YAxis tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
            labelStyle={{ color: "#f0f4f8" }}
            itemStyle={{ color: "#00c3ff" }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#00c3ff"
            strokeWidth={2.5}
            dot={{ fill: "#00c3ff", r: 4 }}
            name="Ø Punkte/Spiel"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function TeamPerformance() {
  const { data, loading } = useFetch("/api/stats/team-performance");
  if (loading) return <div className="skeleton" style={{ height: 260 }} />;
  if (!data) return null;
  return (
    <ChartCard title="Team Scoring" subtitle="Erzielte vs. erlaubte Punkte gesamt">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <YAxis tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
            labelStyle={{ color: "#f0f4f8" }}
          />
          <Legend wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }} />
          <Bar dataKey="points_for"     name="Punkte erzielt"  fill="#00c3ff" radius={[4, 4, 0, 0]} />
          <Bar dataKey="points_against" name="Punkte erlaubt"  fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function WinsRadar() {
  const { data, loading } = useFetch("/api/stats/team-performance");
  const standings = useFetch("/api/stats/standings");
  if (loading || standings.loading) return <div className="skeleton" style={{ height: 260 }} />;
  if (!data || !standings.data) return null;

  const radarData = standings.data.map((t) => ({
    name: t.short,
    Siege: t.wins,
    "Punkte/Spiel": Math.round(t.points_for / (t.wins + t.losses)),
    "Defense": Math.max(0, 50 - Math.round(t.points_against / (t.wins + t.losses))),
  }));

  return (
    <ChartCard title="Team Radar" subtitle="Siege · Offensive · Defensive im Vergleich">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey="name" tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <Radar name="Siege" dataKey="Siege" stroke="#00c3ff" fill="#00c3ff" fillOpacity={0.25} />
          <Radar name="Offensive" dataKey="Punkte/Spiel" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.2} />
          <Radar name="Defensive" dataKey="Defense" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
          <Tooltip
            contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
            labelStyle={{ color: "#f0f4f8" }}
          />
          <Legend wrapperStyle={{ color: TEXT_COLOR, fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function StandingsBar() {
  const { data, loading } = useFetch("/api/stats/standings");
  if (loading) return <div className="skeleton" style={{ height: 260 }} />;
  if (!data) return null;

  const chartData = [...data]
    .sort((a, b) => b.diff - a.diff)
    .map((t) => ({ name: t.short, diff: t.diff, color: t.color }));

  return (
    <ChartCard title="Point Differential" subtitle="Puntdifferenz gesamt je Team">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
          <XAxis dataKey="name" tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <YAxis tick={{ fill: TEXT_COLOR, fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: CHART_BG, border: `1px solid ${GRID_COLOR}`, borderRadius: 8 }}
            labelStyle={{ color: "#f0f4f8" }}
            itemStyle={{ color: "#00c3ff" }}
          />
          <Bar dataKey="diff" name="Differenz" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <rect key={index} fill={entry.diff >= 0 ? "#10b981" : "#f87171"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function Analytics() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>Analytics</h1>
        <p className="page-sub">GFL 2025 · Scoring, Teamperformance & Trends</p>
      </div>
      <div className="charts-grid">
        <ScoringByWeek />
        <TeamPerformance />
        <WinsRadar />
        <StandingsBar />
      </div>
    </div>
  );
}
