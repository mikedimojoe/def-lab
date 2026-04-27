import { useFetch } from "../hooks/useFetch";

function ResultBadge({ home, away }) {
  if (home === null || away === null) return <span className="badge badge-gray">TBD</span>;
  if (home === away) return <span className="badge badge-gray">Unentschieden</span>;
  return null;
}

export default function Matches() {
  const { data, loading, error } = useFetch("/api/matches/");

  return (
    <div className="page">
      <div className="page-header">
        <h1>Matches</h1>
        <p className="page-sub">Spielergebnisse der GFL Saison 2025</p>
      </div>

      {loading && (
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
        </div>
      )}
      {error && <p className="error-msg">Spiele konnten nicht geladen werden.</p>}

      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Woche</th>
              <th>Heim</th>
              <th style={{ textAlign: "center" }}>Ergebnis</th>
              <th>Gast</th>
              <th>Datum</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => {
              const homeWon = m.home_score !== null && m.home_score > m.away_score;
              const awayWon = m.away_score !== null && m.away_score > m.home_score;
              return (
                <tr key={m.id}>
                  <td>
                    <span className="badge badge-ghost">Wk {m.week}</span>
                  </td>
                  <td className={homeWon ? "td-name winner" : "td-name"}>{m.home_team}</td>
                  <td style={{ textAlign: "center" }}>
                    {m.home_score !== null ? (
                      <span className="score-inline">
                        <span className={homeWon ? "score-win" : ""}>{m.home_score}</span>
                        <span className="score-sep-sm">:</span>
                        <span className={awayWon ? "score-win" : ""}>{m.away_score}</span>
                      </span>
                    ) : (
                      <ResultBadge home={m.home_score} away={m.away_score} />
                    )}
                  </td>
                  <td className={awayWon ? "td-name winner" : "td-name"}>{m.away_team}</td>
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
