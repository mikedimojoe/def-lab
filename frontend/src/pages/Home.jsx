import { Link } from "react-router-dom";
import { useFetch } from "../hooks/useFetch";

/* ─── Hero ─────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-grid" />
      </div>
      <div className="hero-content">
        <span className="hero-badge">Football Analytics · GFL 2025</span>
        <h1 className="hero-title">
          Analyse.<br />
          <span className="hero-title-accent">Verstehen.</span><br />
          Gewinnen.
        </h1>
        <p className="hero-sub">
          def-lab liefert tiefe Einblicke in Offense & Defense —
          Play-by-Play, EPA, Trends und Live-Ergebnisse für den deutschen Football.
        </p>
        <div className="hero-cta">
          <Link to="/matches" className="btn btn-primary">Spiele ansehen</Link>
          <Link to="/analytics" className="btn btn-ghost">Analytics öffnen</Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Strip ───────────────────────────────────────────────── */
function StatsStrip() {
  const { data: teams }   = useFetch("/api/teams/");
  const { data: matches } = useFetch("/api/matches/");

  const played  = matches ? matches.filter(m => m.home_score !== null).length : "—";
  const teamCnt = teams ? teams.length : "—";
  const upcoming = matches ? matches.filter(m => m.home_score === null).length : "—";
  const weeks   = matches ? Math.max(...matches.map(m => m.week)) : "—";

  return (
    <section className="stats-strip">
      {[
        { value: teamCnt, label: "Teams" },
        { value: played,  label: "Spiele gespielt" },
        { value: upcoming, label: "Anstehend" },
        { value: `Wk ${weeks}`, label: "Aktuelle Woche" },
      ].map(({ value, label }) => (
        <div key={label} className="stat-item">
          <span className="stat-value">{value}</span>
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </section>
  );
}

/* ─── Recent Matches ────────────────────────────────────────────── */
function ScoreBoard({ match }) {
  const hasScore = match.home_score !== null && match.away_score !== null;
  const homeWon  = hasScore && match.home_score > match.away_score;
  const awayWon  = hasScore && match.away_score > match.home_score;
  return (
    <div className="scoreboard">
      <div className="scoreboard-date">{match.date} · Woche {match.week} · {match.location}</div>
      <div className="scoreboard-row">
        <span className={`team-name ${homeWon ? "winner" : ""}`}>{match.home_team}</span>
        <div className="scores">
          {hasScore ? (
            <>
              <span className={`score ${homeWon ? "score-win" : ""}`}>{match.home_score}</span>
              <span className="score-sep">:</span>
              <span className={`score ${awayWon ? "score-win" : ""}`}>{match.away_score}</span>
            </>
          ) : <span className="score-tbd">TBD</span>}
        </div>
        <span className={`team-name team-name-right ${awayWon ? "winner" : ""}`}>{match.away_team}</span>
      </div>
    </div>
  );
}

function RecentMatches() {
  const { data, loading, error } = useFetch("/api/matches/");
  const recent = data
    ? [...data].filter(m => m.home_score !== null).slice(-3).reverse()
    : [];
  const upcoming = data
    ? data.filter(m => m.home_score === null).slice(0, 2)
    : [];

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Letzte Spiele</h2>
        <Link to="/matches" className="section-link">Alle Spiele →</Link>
      </div>
      {loading && <div className="skeleton-list">{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:88}}/>)}</div>}
      {error && <p className="error-msg">Spiele konnten nicht geladen werden.</p>}
      {!loading && recent.length > 0 && (
        <div className="scoreboard-list">
          {recent.map(m => <ScoreBoard key={m.id} match={m} />)}
        </div>
      )}
      {!loading && upcoming.length > 0 && (
        <>
          <h3 className="upcoming-title">Nächste Spiele</h3>
          <div className="scoreboard-list">
            {upcoming.map(m => <ScoreBoard key={m.id} match={m} />)}
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Standings Preview ─────────────────────────────────────────── */
function StandingsPreview() {
  const { data, loading } = useFetch("/api/stats/standings");
  const top = data ? data.slice(0, 4) : [];

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Tabelle</h2>
        <Link to="/standings" className="section-link">Alle →</Link>
      </div>
      {loading && <div className="skeleton-list">{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:48}}/>)}</div>}
      {!loading && top.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th style={{textAlign:"center"}}>S</th>
              <th style={{textAlign:"center"}}>N</th>
              <th style={{textAlign:"center"}}>PCT</th>
              <th style={{textAlign:"center"}}>DIFF</th>
            </tr>
          </thead>
          <tbody>
            {top.map((t, i) => (
              <tr key={t.id}>
                <td className="td-muted">{i + 1}</td>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
                    <div className="table-avatar" style={{"--c": t.color}}>{t.short}</div>
                    <Link to={`/teams/${t.id}`} className="td-name" style={{color:"inherit"}}>{t.name}</Link>
                  </div>
                </td>
                <td style={{textAlign:"center"}} className="td-name">{t.wins}</td>
                <td style={{textAlign:"center"}} className="td-muted">{t.losses}</td>
                <td style={{textAlign:"center"}}><span className="badge">{t.pct.toFixed(3)}</span></td>
                <td style={{textAlign:"center"}}>
                  <span className={t.diff > 0 ? "diff-pos" : t.diff < 0 ? "diff-neg" : ""}>
                    {t.diff > 0 ? `+${t.diff}` : t.diff}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────────── */
const FEATURES = [
  { icon: "📊", title: "Analytics",     desc: "Scoring-Trends, Point Differential, Team-Radar.",   soon: false, to: "/analytics" },
  { icon: "📋", title: "Tabelle",        desc: "Aktuelle Standings beider Divisionen.",              soon: false, to: "/standings" },
  { icon: "🏈", title: "Play-by-Play",  desc: "Jede Action eines Spiels — filtern & vergleichen.", soon: true,  to: null },
  { icon: "🎯", title: "EPA",            desc: "Expected Points Added pro Drive & Formation.",      soon: true,  to: null },
];

function Features() {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Was def-lab kann</h2>
      </div>
      <div className="features-grid">
        {FEATURES.map(({ icon, title, desc, soon, to }) => (
          <div key={title} className={`feature-card ${soon ? "feature-soon" : ""}`}>
            <span className="feature-icon">{icon}</span>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-desc">{desc}</p>
            {soon
              ? <span className="badge-soon">Coming soon</span>
              : <Link to={to} className="feature-link">Öffnen →</Link>
            }
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── CTA Banner ────────────────────────────────────────────────── */
function CtaBanner() {
  return (
    <section className="cta-banner">
      <h2>Bereit für echte Einblicke?</h2>
      <p>Analysiere Teams und Spiele — kostenlos und ohne Login.</p>
      <div className="hero-cta">
        <Link to="/analytics" className="btn btn-primary">Analytics öffnen</Link>
        <Link to="/standings" className="btn btn-ghost">Tabelle ansehen</Link>
      </div>
    </section>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <>
      <Hero />
      <div className="page-content">
        <StatsStrip />
        <RecentMatches />
        <StandingsPreview />
        <Features />
        <CtaBanner />
      </div>
    </>
  );
}
