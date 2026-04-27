from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(tags=["teams"])


class Team(BaseModel):
    id: int
    name: str
    short: str
    league: str
    division: str
    season: str
    wins: int
    losses: int
    points_for: int
    points_against: int
    color: str


TEAMS: List[Team] = [
    Team(id=1, name="Unicorns of Love", short="UOL", league="GFL", division="Süd", season="2025",
         wins=5, losses=1, points_for=198, points_against=112, color="#ff6b35"),
    Team(id=2, name="Schwäbisch Hall Unicorns", short="SHA", league="GFL", division="Süd", season="2025",
         wins=4, losses=2, points_for=176, points_against=134, color="#7c3aed"),
    Team(id=3, name="New Yorker Lions Braunschweig", short="BSL", league="GFL", division="Nord", season="2025",
         wins=5, losses=1, points_for=210, points_against=98, color="#10b981"),
    Team(id=4, name="Dresden Monarchs", short="DRS", league="GFL", division="Nord", season="2025",
         wins=3, losses=3, points_for=154, points_against=156, color="#f59e0b"),
    Team(id=5, name="Munich Cowboys", short="MCO", league="GFL", division="Süd", season="2025",
         wins=2, losses=4, points_for=132, points_against=168, color="#00c3ff"),
    Team(id=6, name="Berlin Rebels", short="BER", league="GFL", division="Nord", season="2025",
         wins=1, losses=5, points_for=98, points_against=201, color="#f87171"),
]


@router.get("/", response_model=List[Team])
def list_teams(division: Optional[str] = None):
    if division:
        return [t for t in TEAMS if t.division.lower() == division.lower()]
    return TEAMS


@router.get("/{team_id}", response_model=Team)
def get_team(team_id: int):
    for team in TEAMS:
        if team.id == team_id:
            return team
    raise HTTPException(status_code=404, detail="Team not found")
