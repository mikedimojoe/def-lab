from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(tags=["matches"])


class Match(BaseModel):
    id: int
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    date: str
    week: int


MATCHES: List[Match] = [
    Match(id=1, home_team="Unicorns of Love", away_team="Schwäbisch Hall Unicorns",
          home_score=28, away_score=21, date="2025-05-10", week=1),
]


@router.get("/", response_model=List[Match])
def list_matches():
    return MATCHES
