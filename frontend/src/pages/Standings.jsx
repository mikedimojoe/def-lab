import { useFetch } from "../hooks/useFetch";

export default function Standings() {
  const { data, loading, error } = useFetch("/api/stats/standings");

  const divisions = data
    ? [...new Set(data.map((t) => t.division))].sort()
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tabelle</h1>
        <p className="page-sub">GFL Saison 2025 · Standings</p>
      </div>

      {loading && (
        <div className="skeleton-list">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 52 }} />
          ))}
        </div>
      )}
      {error && <p className="error-msg">Tabelle konnte nicht geladen werden.</p>}

      {data && divisions.map((div) => (
        <div key={div} style={{ marginBottom: "2.5rem" }}>
          <h2 className="division-title">Division {div}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th style={{ textAlign: "center" }}>S</th>
                <th style={{ textAlign: "center" }}>N</th>
                <th style={{ textAlign: "center" }}>PCT</th>
                <th style={{ textAlign: "center" }}>PF</th>
                <th style={{ textAlign: "center" }}>PA</th>
                <th style={{ textAlign: "center" }}>DIFF</th>
              </tr>
            </thead>
            <tbody>
              {data
                .filter((t) => t.division === div)
                .map((t, i) => (
                  <tr key={t.id}>
                    <td className="td-muted">{i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                          className="table-avatar"
                          style={{ "--c": t.color }}
                        >
                          {t.short}
                        </div>
                        <span className="td-name">{t.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }} className="td-name">{t.wins}</td>
                    <td style={{ textAlign: "center" }} className="td-muted">{t.losses}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge">{t.pct.toFixed(3)}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>{t.points_for}</td>
                    <td style={{ textAlign: "center" }}>{t.points_against}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={t.diff > 0 ? "diff-pos" : t.diff < 0 ? "diff-neg" : ""}>
                        {t.diff > 0 ? `+${t.diff}` : t.diff}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
