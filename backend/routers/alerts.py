"""GET /api/alerts + POST /api/alerts/subscribe — alert center."""
from fastapi import APIRouter, Query

from models.schemas import Alert, SubscribeRequest, SubscribeResponse
from services import alerts as alert_service

router = APIRouter(tags=["alerts"])


@router.get("/alerts", response_model=list[Alert])
def list_alerts(
    severity: str | None = Query(None, description="low|medium|high|critical|all"),
    limit: int = Query(50, ge=1, le=200),
) -> list[dict]:
    return alert_service.list_alerts(severity=severity, limit=limit)


@router.post("/alerts/subscribe", response_model=SubscribeResponse)
def subscribe(req: SubscribeRequest) -> dict:
    return alert_service.create_subscription(req.model_dump())
