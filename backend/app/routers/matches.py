from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(tags=["matches"])


class Match(BaseModel):
    id: int
    home_team: str
    home_team_short: str
    away_team: str
    away_team_short: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    date: str
    week: int
    location: str


MATCHES: List[Match] = [
    # Week 1
    Match(id=1,  home_team="Unicorns of Love", home_team_short="UOL",
          away_team="Munich Cowboys", away_team_short="MCO",
          home_score=35, away_score=14, date="2025-04-26", week=1, location="Heidelberg"),
    Match(id=2,  home_team="New Yorker Lions Braunschweig", home_team_short="BSL",
          away_team="Berlin Rebels", away_team_short="BER",
          home_score=42, away_score=7,  date="2025-04-26", week=1, location="Braunschweig"),
    Match(id=3,  home_team="Schwäbisch Hall Unicorns", home_team_short="SHA",
          away_team="Dresden Monarchs", away_team_short="DRS",
          home_score=28, away_score=21, date="2025-04-27", week=1, location="Schwäbisch Hall"),
    # Week 2
    Match(id=4,  home_team="Munich Cowboys", home_team_short="MCO",
          away_team="Dresden Monarchs", away_team_short="DRS",
          home_score=21, away_score=28, date="2025-05-03", week=2, location="München"),
    Match(id=5,  home_team="Berlin Rebels", home_team_short="BER",
          away_team="Schwäbisch Hall Unicorns", away_team_short="SHA",
          home_score=14, away_score=31, date="2025-05-03", week=2, location="Berlin"),
    Match(id=6,  home_team="Unicorns of Love", home_team_short="UOL",
          away_team="New Yorker Lions Braunschweig", away_team_short="BSL",
          home_score=24, away_score=21, date="2025-05-04", week=2, location="Heidelberg"),
    # Week 3
    Match(id=7,  home_team="Dresden Monarchs", home_team_short="DRS",
          away_team="Unicorns of Love", away_team_short="UOL",
          home_score=17, away_score=38, date="2025-05-10", week=3, location="Dresden"),
    Match(id=8,  home_team="Schwäbisch Hall Unicorns", home_team_short="SHA",
          away_team="New Yorker Lions Braunschweig", away_team_short="BSL",
          home_score=21, away_score=35, date="2025-05-10", week=3, location="Schwäbisch Hall"),
    Match(id=9,  home_team="Munich Cowboys", home_team_short="MCO",
          away_team="Berlin Rebels", away_team_short="BER",
          home_score=28, away_score=14, date="2025-05-11", week=3, location="München"),
    # Week 4
    Match(id=10, home_team="New Yorker Lions Braunschweig", home_team_short="BSL",
          away_team="Munich Cowboys", away_team_short="MCO",
          home_score=49, away_score=10, date="2025-05-17", week=4, location="Braunschweig"),
    Match(id=11, home_team="Unicorns of Love", home_team_short="UOL",
          away_team="Berlin Rebels", away_team_short="BER",
          home_score=31, away_score=7,  date="2025-05-17", week=4, location="Heidelberg"),
    Match(id=12, home_team="Dresden Monarchs", home_team_short="DRS",
          away_team="Schwäbisch Hall Unicorns", away_team_short="SHA",
          home_score=24, away_score=17, date="2025-05-18", week=4, location="Dresden"),
    # Week 5
    Match(id=13, home_team="Berlin Rebels", home_team_short="BER",
          away_team="Dresden Monarchs", away_team_short="DRS",
          home_score=21, away_score=24, date="2025-05-24", week=5, location="Berlin"),
    Match(id=14, home_team="Schwäbisch Hall Unicorns", home_team_short="SHA",
          away_team="Unicorns of Love", away_team_short="UOL",
          home_score=28, away_score=35, date="2025-05-24", week=5, location="Schwäbisch Hall"),
    Match(id=15, home_team="Munich Cowboys", home_team_short="MCO",
          away_team="New Yorker Lions Braunschweig", away_team_short="BSL",
          home_score=17, away_score=42, date="2025-05-25", week=5, location="München"),
    # Week 6
    Match(id=16, home_team="New Yorker Lions Braunschweig", home_team_short="BSL",
          away_team="Schwäbisch Hall Unicorns", away_team_short="SHA",
          home_score=28, away_score=24, date="2025-05-31", week=6, location="Braunschweig"),
    Match(id=17, home_team="Dresden Monarchs", home_team_short="DRS",
          away_team="Munich Cowboys", away_team_short="MCO",
          home_score=31, away_score=21, date="2025-05-31", week=6, location="Dresden"),
    Match(id=18, home_team="Unicorns of Love", home_team_short="UOL",
          away_team="Berlin Rebels", away_team_short="BER",
          home_score=None, away_score=None, date="2025-06-01", week=6, location="Heidelberg"),
]


@router.get("/", response_model=List[Match])
def list_matches(week: Optional[int] = None, team: Optional[str] = None):
    result = MATCHES
    if week:
        result = [m for m in result if m.week == week]
    if team:
        t = team.lower()
        result = [m for m in result if t in m.home_team.lower() or t in m.away_team.lower()
                  or t in m.home_team_short.lower() or t in m.away_team_short.lower()]
    return result
