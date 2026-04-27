from fastapi import APIRouter
from app.routers.teams import TEAMS
from app.routers.matches import MATCHES

router = APIRouter(tags=["stats"])


@router.get("/standings")
def standings():
    rows = []
    for team in TEAMS:
        played = team.wins + team.losses
        pct = round(team.wins / played, 3) if played > 0 else 0.0
        diff = team.points_for - team.points_against
        rows.append({
            "id": team.id,
            "name": team.name,
            "short": team.short,
            "division": team.division,
            "wins": team.wins,
            "losses": team.losses,
            "pct": pct,
            "points_for": team.points_for,
            "points_against": team.points_against,
            "diff": diff,
            "color": team.color,
        })
    rows.sort(key=lambda x: (-x["wins"], -x["diff"]))
    return rows


@router.get("/scoring-by-week")
def scoring_by_week():
    weeks: dict = {}
    for m in MATCHES:
        if m.home_score is None:
            continue
        w = f"Wk {m.week}"
        if w not in weeks:
            weeks[w] = {"week": w, "total": 0, "games": 0}
        weeks[w]["total"] += m.home_score + m.away_score
        weeks[w]["games"] += 1
    result = []
    for w in sorted(weeks.keys()):
        d = weeks[w]
        d["avg"] = round(d["total"] / d["games"], 1) if d["games"] else 0
        result.append(d)
    return result


@router.get("/team-performance")
def team_performance():
    rows = []
    for team in TEAMS:
        rows.append({
            "name": team.short,
            "points_for": team.points_for,
            "points_against": team.points_against,
            "wins": team.wins,
            "color": team.color,
        })
    rows.sort(key=lambda x: -x["points_for"])
    return rows
