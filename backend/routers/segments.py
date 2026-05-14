"""Road-segment listing — useful for Phase 1 verification and the map."""
from fastapi import APIRouter

from db.database import query_all
from models.schemas import RoadSegment

router = APIRouter(prefix="/segments", tags=["segments"])


@router.get("", response_model=list[RoadSegment])
def list_segments() -> list[dict]:
    return query_all(
        """
        select id, name, code, segment_type, length_km, lanes, speed_limit_kmh,
               start_lat, start_lng, end_lat, end_lng, geometry
        from road_segments
        order by id
        """
    )
