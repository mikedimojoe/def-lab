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
          <Link to="/teams" className="btn btn-ghost">Teams entdecken</Link>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Strip ───────────────────────────────────────────────── */
const STATS = [
  { value: "GFL", label: "Liga" },
  { value: "2025", label: "Saison" },
  { value: "Live", label: "Ergebnisse" },
  { value: "EPA", label: "Analytics" },
];

function StatsStrip() {
  return (
    <section className="stats-strip">
      {STATS.map(({ value, label }) => (
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
  const homeWon = hasScore && match.home_score > match.away_score;
  const awayWon = hasScore && match.away_score > match.home_score;

  return (
    <div className="scoreboard">
      <div className="scoreboard-date">{match.date} · Woche {match.week}</div>
      <div className="scoreboard-row">
        <span className={`team-name ${homeWon ? "winner" : ""}`}>{match.home_team}</span>
        <div className="scores">
          {hasScore ? (
            <>
              <span className={`score ${homeWon ? "score-win" : ""}`}>{match.home_score}</span>
              <span className="score-sep">:</span>
              <span className={`score ${awayWon ? "score-win" : ""}`}>{match.away_score}</span>
            </>
          ) : (
            <span className="score-tbd">TBD</span>
          )}
        </div>
        <span className={`team-name team-name-right ${awayWon ? "winner" : ""}`}>{match.away_team}</span>
      </div>
    </div>
  );
}

function RecentMatches() {
  const { data, loading, error } = useFetch("/api/matches/");
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Letzte Spiele</h2>
        <Link to="/matches" className="section-link">Alle Spiele →</Link>
      </div>
      {loading && <div className="skeleton-list">{[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 88 }} />)}</div>}
      {error && <p className="error-msg">Spiele konnten nicht geladen werden.</p>}
      {data && data.length === 0 && <p className="muted-msg">Noch keine Spiele vorhanden.</p>}
      {data && (
        <div className="scoreboard-list">
          {data.map((m) => <ScoreBoard key={m.id} match={m} />)}
        </div>
      )}
    </section>
  );
}

/* ─── Teams Grid ────────────────────────────────────────────────── */
const TEAM_INITIALS = (name) =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const TEAM_COLORS = ["#00c3ff", "#ff6b35", "#7c3aed", "#10b981", "#f59e0b"];

function TeamCard({ team, idx }) {
  const color = TEAM_COLORS[idx % TEAM_COLORS.length];
  return (
    <div className="team-card">
      <div className="team-avatar" style={{ "--c": color }}>
        {TEAM_INITIALS(team.name)}
      </div>
      <div className="team-info">
        <span className="team-card-name">{team.name}</span>
        <span className="team-card-meta">{team.league} · {team.season}</span>
      </div>
      <Link to="/teams" className="team-arrow">→</Link>
    </div>
  );
}

function TeamsSection() {
  const { data, loading, error } = useFetch("/api/teams/");
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Teams</h2>
        <Link to="/teams" className="section-link">Alle Teams →</Link>
      </div>
      {loading && <div className="skeleton-list">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}</div>}
      {error && <p className="error-msg">Teams konnten nicht geladen werden.</p>}
      {data && (
        <div className="team-list">
          {data.map((t, i) => <TeamCard key={t.id} team={t} idx={i} />)}
        </div>
      )}
    </section>
  );
}

/* ─── Features ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: "🏈",
    title: "Play-by-Play",
    desc: "Jede Action eines Spiels — filtern, suchen, vergleichen.",
    soon: false,
  },
  {
    icon: "📊",
    title: "EPA & Effizienz",
    desc: "Expected Points Added pro Drive, Formation und Down.",
    soon: true,
  },
  {
    icon: "🛡️",
    title: "Defensive Analytics",
    desc: "Coverage-Typen, Blitz-Rate, Yards After Contact.",
    soon: true,
  },
  {
    icon: "🎯",
    title: "Offensive Trends",
    desc: "Run/Pass-Ratio, Completion%, Redzone-Effizienz.",
    soon: true,
  },
];

function Features() {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Was def-lab kann</h2>
      </div>
      <div className="features-grid">
        {FEATURES.map(({ icon, title, desc, soon }) => (
          <div key={title} className={`feature-card ${soon ? "feature-soon" : ""}`}>
            <span className="feature-icon">{icon}</span>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-desc">{desc}</p>
            {soon && <span className="badge-soon">Coming soon</span>}
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
        <Link to="/matches" className="btn btn-primary">Jetzt starten</Link>
        <Link to="/teams" className="btn btn-ghost">Teams ansehen</Link>
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
        <TeamsSection />
        <Features />
        <CtaBanner />
      </div>
    </>
  );
}
