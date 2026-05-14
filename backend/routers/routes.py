"""GET /api/routes — three compared routes with toll/fuel/ETA + AI pick."""
from fastapi import APIRouter, Query

from models.schemas import RoutesResponse
from services.toll_intelligence import compare_routes

router = APIRouter(tags=["routes"])


@router.get("/routes", response_model=RoutesResponse)
def routes(
    origin: str = Query("Connaught Place, Delhi"),
    destination: str = Query("Cyber City, Gurgaon"),
) -> dict:
    return compare_routes(origin, destination)
