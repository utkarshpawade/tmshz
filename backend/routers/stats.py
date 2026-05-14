"""GET /api/stats — dashboard KPI numbers."""
from fastapi import APIRouter

from models.schemas import StatsResponse
from services.stats import get_stats

router = APIRouter(tags=["stats"])


@router.get("/stats", response_model=StatsResponse)
def stats() -> dict:
    return get_stats()
