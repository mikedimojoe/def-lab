import { useParams, Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";

export default function TeamDetail() {
  const { id } = useParams();
  const { data: team, loading: tLoad, error: tErr } = useFetch(`/api/teams/${id}`);
  const { data: matches, loading: mLoad } = useFetch(`/api/matches/?team=${id}`);

  if (tLoad) return <div className="page"><div className="skeleton-list">{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:60}}/>)}</div></div>;
  if (tErr || !team) return <div className="page"><p className="error-msg">Team nicht gefunden.</p><Link to="/teams" className="btn btn-ghost" style={{marginTop:"1rem"}}>← Zurück</Link></div>;

  const diff = team.points_for - team.points_against;
  const played = team.wins + team.losses;
  const pct = played > 0 ? ((team.wins / played) * 100).toFixed(1) : "0.0";

  const teamMatches = matches
    ? matches.filter(m =>
        m.home_team_short === team.short || m.away_team_short === team.short
      )
    : [];

  return (
    <div className="page">
      {/* Back */}
      <Link to="/teams" className="back-link">← Alle Teams</Link>

      {/* Hero */}
      <div className="team-hero" style={{ "--c": team.color }}>
        <div className="team-hero-avatar">{team.short}</div>
        <div className="team-hero-info">
          <h1 className="team-hero-name">{team.name}</h1>
          <p className="team-hero-meta">{team.league} · Division {team.division} · {team.season}</p>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="team-stat-pills">
        <div className="stat-pill">
          <span className="pill-value">{team.wins}</span>
          <span className="pill-label">Siege</span>
        </div>
        <div className="stat-pill">
          <span className="pill-value">{team.losses}</span>
          <span className="pill-label">Niederlagen</span>
        </div>
        <div className="stat-pill">
          <span className="pill-value">{pct}%</span>
          <span className="pill-label">Win-Rate</span>
        </div>
        <div className="stat-pill">
          <span className="pill-value">{team.points_for}</span>
          <span className="pill-label">PF</span>
        </div>
        <div className="stat-pill">
          <span className="pill-value">{team.points_against}</span>
          <span className="pill-label">PA</span>
        </div>
        <div className="stat-pill">
          <span className={`pill-value ${diff > 0 ? "diff-pos" : diff < 0 ? "diff-neg" : ""}`}>
            {diff > 0 ? `+${diff}` : diff}
          </span>
          <span className="pill-label">DIFF</span>
        </div>
      </div>

      {/* Matches */}
      <h2 className="section-title" style={{ marginTop: "2.5rem", marginBottom: "1rem" }}>Spiele</h2>
      {mLoad && <div className="skeleton-list">{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:60}}/>)}</div>}
      {!mLoad && teamMatches.length === 0 && <p className="muted-msg">Keine Spiele gefunden.</p>}
      {!mLoad && teamMatches.length > 0 && (
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
            {teamMatches.map((m) => {
              const isHome = m.home_team_short === team.short;
              const won = isHome
                ? m.home_score !== null && m.home_score > m.away_score
                : m.away_score !== null && m.away_score > m.home_score;
              const result = m.home_score === null ? null : won ? "W" : "L";
              return (
                <tr key={m.id}>
                  <td><span className="badge badge-ghost">Wk {m.week}</span></td>
                  <td className={m.home_team_short === team.short ? "td-name" : ""}>{m.home_team}</td>
                  <td style={{ textAlign: "center" }}>
                    {m.home_score !== null ? (
                      <span className="score-inline">
                        <span className={m.home_score > m.away_score ? "score-win" : ""}>{m.home_score}</span>
                        <span className="score-sep-sm">:</span>
                        <span className={m.away_score > m.home_score ? "score-win" : ""}>{m.away_score}</span>
                      </span>
                    ) : <span className="badge badge-gray">TBD</span>}
                  </td>
                  <td className={m.away_team_short === team.short ? "td-name" : ""}>{m.away_team}</td>
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
