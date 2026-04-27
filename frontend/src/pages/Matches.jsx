import { useState } from "react";
import { useFetch } from "../hooks/useFetch";

function buildQuery(week, team) {
  const params = [];
  if (week) params.push(`week=${week}`);
  if (team) params.push(`team=${encodeURIComponent(team)}`);
  return params.length ? `/api/matches/?${params.join("&")}` : "/api/matches/";
}

export default function Matches() {
  const [filterWeek, setFilterWeek] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  const { data, loading, error } = useFetch(buildQuery(filterWeek, filterTeam));
  const { data: allMatches } = useFetch("/api/matches/");
  const { data: teams } = useFetch("/api/teams/");

  const weeks = allMatches
    ? [...new Set(allMatches.map((m) => m.week))].sort((a, b) => a - b)
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Matches</h1>
        <p className="page-sub">GFL Saison 2025 · {data ? `${data.length} Spiele` : ""}</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="filter-select"
          value={filterWeek}
          onChange={(e) => setFilterWeek(e.target.value)}
        >
          <option value="">Alle Wochen</option>
          {weeks.map((w) => (
            <option key={w} value={w}>Woche {w}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
        >
          <option value="">Alle Teams</option>
          {teams && teams.map((t) => (
            <option key={t.id} value={t.short}>{t.name}</option>
          ))}
        </select>

        {(filterWeek || filterTeam) && (
          <button
            className="btn btn-ghost filter-clear"
            onClick={() => { setFilterWeek(""); setFilterTeam(""); }}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {loading && (
        <div className="skeleton-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
        </div>
      )}
      {error && <p className="error-msg">Spiele konnten nicht geladen werden.</p>}
      {data && data.length === 0 && <p className="muted-msg">Keine Spiele für diese Auswahl gefunden.</p>}

      {data && data.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Woche</th>
              <th>Heim</th>
              <th style={{ textAlign: "center" }}>Ergebnis</th>
              <th>Gast</th>
              <th>Ort</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => {
              const homeWon = m.home_score !== null && m.home_score > m.away_score;
              const awayWon = m.away_score !== null && m.away_score > m.home_score;
              return (
                <tr key={m.id}>
                  <td><span className="badge badge-ghost">Wk {m.week}</span></td>
                  <td className={homeWon ? "td-name winner" : "td-name"}>{m.home_team}</td>
                  <td style={{ textAlign: "center" }}>
                    {m.home_score !== null ? (
                      <span className="score-inline">
                        <span className={homeWon ? "score-win" : ""}>{m.home_score}</span>
                        <span className="score-sep-sm">:</span>
                        <span className={awayWon ? "score-win" : ""}>{m.away_score}</span>
                      </span>
                    ) : <span className="badge badge-gray">TBD</span>}
                  </td>
                  <td className={awayWon ? "td-name winner" : "td-name"}>{m.away_team}</td>
                  <td className="td-muted">{m.location}</td>
                  <td className="td-muted">{m.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
