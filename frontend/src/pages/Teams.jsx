import { Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";

export default function Teams() {
  const { data, loading, error } = useFetch("/api/teams/");

  const divisions = data
    ? [...new Set(data.map((t) => t.division))].sort()
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Teams</h1>
        <p className="page-sub">GFL Saison 2025 · {data ? `${data.length} Teams` : ""}</p>
      </div>

      {loading && (
        <div className="skeleton-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
          ))}
        </div>
      )}
      {error && <p className="error-msg">Teams konnten nicht geladen werden.</p>}

      {data && divisions.map((div) => (
        <div key={div} style={{ marginBottom: "2.5rem" }}>
          <h2 className="division-title">Division {div}</h2>
          <div className="team-cards-grid">
            {data.filter((t) => t.division === div).map((t) => (
              <Link to={`/teams/${t.id}`} key={t.id} className="team-detail-card">
                <div className="tdc-header" style={{ "--c": t.color }}>
                  <div className="tdc-avatar">{t.short}</div>
                  <div className="tdc-record">
                    <span className="tdc-wins">{t.wins}S</span>
                    <span className="tdc-losses">{t.losses}N</span>
                  </div>
                </div>
                <div className="tdc-body">
                  <span className="tdc-name">{t.name}</span>
                  <div className="tdc-stats">
                    <span>PF: <strong>{t.points_for}</strong></span>
                    <span>PA: <strong>{t.points_against}</strong></span>
                    <span>DIFF: <strong className={t.points_for - t.points_against > 0 ? "diff-pos" : "diff-neg"}>
                      {t.points_for - t.points_against > 0 ? "+" : ""}{t.points_for - t.points_against}
                    </strong></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
