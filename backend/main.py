"""
AI-Powered Smart Traffic Congestion Predictor — FastAPI backend.

Phase 1: app skeleton, DB pool, health + segments routers.
Phases 2-3 add the ML model and the full prediction / heatmap / routes /
alerts / emergency / chat / WebSocket surface.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.database import close_pool, init_pool
from routers import (
    alerts,
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
    init_pool()
    yield
    close_pool()


app = FastAPI(
    title="AI Traffic Congestion Predictor",
    description="Predicts Delhi NCR traffic congestion 30-60 minutes ahead.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers are mounted under /api
for r in (health, segments, predict, heatmap, stats, routes, alerts, emergency, chat, simulate):
    app.include_router(r.router, prefix=settings.api_prefix)

# WebSocket router is mounted at the root (/ws/live-updates)
app.include_router(live.router)


@app.get("/")
def root() -> dict:
    return {
        "service": "AI Traffic Congestion Predictor",
        "version": app.version,
        "docs": "/docs",
        "health": f"{settings.api_prefix}/health",
    }
