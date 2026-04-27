from fastapi import APIRouter
from typing import List
from pydantic import BaseModel

router = APIRouter(tags=["teams"])


class Team(BaseModel):
    id: int
    name: str
    league: str
    season: str


# Placeholder — replace with DB queries
TEAMS: List[Team] = [
    Team(id=1, name="Unicorns of Love", league="GFL", season="2025"),
    Team(id=2, name="Schwäbisch Hall Unicorns", league="GFL", season="2025"),
]


@router.get("/", response_model=List[Team])
def list_teams():
    return TEAMS


@router.get("/{team_id}", response_model=Team)
def get_team(team_id: int):
    for team in TEAMS:
        if team.id == team_id:
            return team
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Team not found")
