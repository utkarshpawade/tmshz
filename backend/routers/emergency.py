"""POST /api/emergency-route — priority corridor + signal pre-emption."""
from fastapi import APIRouter

from models.schemas import EmergencyRequest, EmergencyResponse
from services.emergency import build_emergency_route

router = APIRouter(tags=["emergency"])


@router.post("/emergency-route", response_model=EmergencyResponse)
def emergency_route(req: EmergencyRequest) -> dict:
    return build_emergency_route(req.vehicle_type, req.origin, req.destination)
