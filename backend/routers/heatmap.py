"""GET /api/heatmap — GeoJSON congestion overlay + high-risk zones."""
from fastapi import APIRouter

from services.heatmap import build_heatmap

router = APIRouter(tags=["heatmap"])


@router.get("/heatmap")
def heatmap() -> dict:
    return build_heatmap()
