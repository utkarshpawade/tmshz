"""GET/POST /api/routes — three compared routes with toll/fuel/ETA + AI pick.

The GET form keeps backward compatibility (query params). The POST form takes
JSON `{ origin, destination }` and runs the live TomTom + Groq pipeline.
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel

from models.schemas import RoutesResponse
from services.routing import compare_routes_live
from services.toll_intelligence import compare_routes

router = APIRouter(tags=["routes"])


class RouteQuery(BaseModel):
    origin: str = "Connaught Place, Delhi"
    destination: str = "Cyber City, Gurgaon"


async def _resolve(origin: str, destination: str) -> dict:
    """Try the live TomTom+Groq pipeline first; fall back to the static
    templates if TomTom is unconfigured or unreachable."""
    live = await compare_routes_live(origin, destination)
    if live:
        return live
    # Static fallback so the demo still renders three rows.
    return compare_routes(origin, destination)


@router.get("/routes", response_model=RoutesResponse)
async def routes_get(
    origin: str = Query("Connaught Place, Delhi"),
    destination: str = Query("Cyber City, Gurgaon"),
) -> dict:
    return await _resolve(origin, destination)


@router.post("/routes", response_model=RoutesResponse)
async def routes_post(body: RouteQuery) -> dict:
    return await _resolve(body.origin, body.destination)
