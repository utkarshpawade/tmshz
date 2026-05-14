"""
AI-Powered Smart Traffic Congestion Predictor -- FastAPI backend.

Routes:
  /api/health, /api/segments, /api/predict, /api/heatmap, /api/stats,
  /api/routes, /api/alerts, /api/emergency-route, /api/chat,
  /api/simulate-rush, /api/analytics/*, /ws/live-updates
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.database import close_pool, init_pool
from routers import (
    alerts,
    analytics,
    chat,
    emergency,
    health,
    heatmap,
    live,
    predict,
    routes,
    segments,
    simulate,
    stats,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_pool()
    except Exception as e:
        # Backend should still boot if DB is unreachable -- routes that need
        # DB will return graceful errors. This lets the UI demo work offline.
        print(f"[warn] DB pool init failed: {type(e).__name__}: {e}")
    yield
    try:
        close_pool()
    except Exception:
        pass


app = FastAPI(
    title="AI Traffic Congestion Predictor",
    description="Predicts Delhi NCR traffic congestion 30-60 minutes ahead.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers under /api
for r in (
    health, segments, predict, heatmap, stats, routes, alerts,
    emergency, chat, simulate, analytics,
):
    app.include_router(r.router, prefix=settings.api_prefix)

# WebSocket router at root
app.include_router(live.router)


@app.get("/")
def root() -> dict:
    return {
        "service": "AI Traffic Congestion Predictor",
        "version": app.version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
