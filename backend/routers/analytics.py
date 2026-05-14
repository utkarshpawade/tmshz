"""GET/POST /api/analytics/* -- ML insights backed by the 7k dataset."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services import analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


class AnalyticsPredictRequest(BaseModel):
    location: Optional[str] = None
    hour: Optional[int] = 9
    day_of_week: Optional[int] = 1
    traffic_volume: Optional[float] = 400
    avg_speed_kmh: Optional[float] = 35
    weather: Optional[str] = "Clear"
    rain_mm: Optional[float] = 0
    accident: Optional[bool] = False
    event: Optional[bool] = False
    pt_density: Optional[float] = 50
    lat: Optional[float] = 28.6139
    lng: Optional[float] = 77.2090


@router.get("/overview")
def overview() -> dict:
    return analytics.overview()


@router.get("/by-location")
def by_location() -> list[dict]:
    return analytics.by_location()


@router.get("/hourly")
def hourly_profile() -> list[dict]:
    return analytics.hourly_profile()


@router.get("/weather")
def weather_impact() -> list[dict]:
    return analytics.weather_impact()


@router.post("/predict")
def predict(req: AnalyticsPredictRequest) -> dict:
    try:
        return analytics.predict_single(req.model_dump())
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
