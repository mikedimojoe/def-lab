import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// Convert dynamic API paths → static .json paths + client-side filter params
function resolveUrl(path) {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  const clean = base.replace(/\/$/, ""); // strip trailing slash

  // Map to static JSON file
  const staticMap = {
    "/api/teams":              "/api/teams.json",
    "/api/matches":            "/api/matches.json",
    "/api/stats/standings":    "/api/stats/standings.json",
    "/api/stats/scoring-by-week": "/api/stats/scoring-by-week.json",
    "/api/stats/team-performance": "/api/stats/team-performance.json",
  };

  // Team detail: /api/teams/1 → /api/teams.json (filter client-side)
  const teamMatch = clean.match(/^\/api\/teams\/(\d+)$/);
  if (teamMatch) return { url: "/api/teams.json", teamId: Number(teamMatch[1]) };

  const url = staticMap[clean] ?? `${API_BASE}${path}`;
  return { url, week: params.get("week") ? Number(params.get("week")) : null, team: params.get("team") };
}

export function useFetch(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    const { url, teamId, week, team } = resolveUrl(path);

    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => {
        if (cancelled) return;
        // Client-side filtering
        if (teamId !== undefined) {
          const found = Array.isArray(d) ? d.find((t) => t.id === teamId) : d;
          setData(found ?? null);
          if (!found) setError(new Error("Not found"));
        } else if (week || team) {
          let result = d;
          if (week) result = result.filter((m) => m.week === week);
          if (team) {
            const t = team.toLowerCase();
            result = result.filter((m) =>
              m.home_team?.toLowerCase().includes(t) ||
              m.away_team?.toLowerCase().includes(t) ||
              m.home_team_short?.toLowerCase() === t ||
              m.away_team_short?.toLowerCase() === t
            );
          }
          setData(result);
        } else {
          setData(d);
        }
      })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path]);

  return { data, loading, error };
}
