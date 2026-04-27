import { useFetch } from "../hooks/useFetch";

const TEAM_COLORS = ["#00c3ff", "#ff6b35", "#7c3aed", "#10b981", "#f59e0b"];
const TEAM_INITIALS = (name) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function Teams() {
  const { data, loading, error } = useFetch("/api/teams/");

  return (
    <div className="page">
      <div className="page-header">
        <h1>Teams</h1>
        <p className="page-sub">Alle Teams der GFL Saison 2025</p>
      </div>

      {loading && (
        <div className="skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
          ))}
        </div>
      )}
      {error && <p className="error-msg">Teams konnten nicht geladen werden.</p>}

      {data && (
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Liga</th>
              <th>Saison</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t, i) => (
              <tr key={t.id}>
                <td>
                  <div
                    className="table-avatar"
                    style={{ "--c": TEAM_COLORS[i % TEAM_COLORS.length] }}
                  >
                    {TEAM_INITIALS(t.name)}
                  </div>
                </td>
                <td className="td-name">{t.name}</td>
                <td>
                  <span className="badge">{t.league}</span>
                </td>
                <td>{t.season}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
