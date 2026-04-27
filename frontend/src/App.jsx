import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}${path}`)
      .then((r) => r.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading, error };
}

function Nav() {
  const { pathname } = useLocation();
  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/teams", label: "Teams" },
    { to: "/matches", label: "Matches" },
  ];
  return (
    <nav className="nav">
      <span className="nav-logo">def-lab</span>
      <div className="nav-links">
        {links.map(({ to, label }) => (
          <Link key={to} to={to} className={pathname === to ? "active" : ""}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function Dashboard() {
  return (
    <div className="page">
      <h1>Football Analytics</h1>
      <p className="subtitle">Defensive & offensive insights — powered by def-lab</p>
      <div className="card-grid">
        <div className="card">
          <h3>Teams</h3>
          <p>Browse team rosters and season stats.</p>
          <Link to="/teams">View Teams</Link>
        </div>
        <div className="card">
          <h3>Matches</h3>
          <p>Game results, play-by-play, and trends.</p>
          <Link to="/matches">View Matches</Link>
        </div>
        <div className="card">
          <h3>Analytics</h3>
          <p>Defensive efficiency, EPA, and more.</p>
          <span className="coming-soon">Coming soon</span>
        </div>
      </div>
    </div>
  );
}

function Teams() {
  const { data, loading, error } = useFetch("/api/teams/");
  return (
    <div className="page">
      <h1>Teams</h1>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">Error loading teams.</p>}
      {data && (
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>League</th><th>Season</th></tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>{t.league}</td>
                <td>{t.season}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Matches() {
  const { data, loading, error } = useFetch("/api/matches/");
  return (
    <div className="page">
      <h1>Matches</h1>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">Error loading matches.</p>}
      {data && (
        <table className="data-table">
          <thead>
            <tr><th>Wk</th><th>Home</th><th>Score</th><th>Away</th><th>Date</th></tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.id}>
                <td>{m.week}</td>
                <td>{m.home_team}</td>
                <td>{m.home_score ?? "—"} : {m.away_score ?? "—"}</td>
                <td>{m.away_team}</td>
                <td>{m.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/matches" element={<Matches />} />
        </Routes>
      </main>
    </div>
  );
}
