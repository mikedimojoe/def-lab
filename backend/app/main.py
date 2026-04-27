from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, teams, matches, stats

app = FastAPI(title="def-lab API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production via ALLOWED_ORIGINS env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(teams.router, prefix="/api/teams")
app.include_router(matches.router, prefix="/api/matches")
app.include_router(stats.router, prefix="/api/stats")
