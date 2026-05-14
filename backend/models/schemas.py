"""Pydantic request/response models shared across routers."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

CongestionLabel = Literal["Low", "Medium", "High", "Critical"]
Severity = Literal["low", "medium", "high", "critical"]
TrafficLevel = Literal["low", "medium", "high"]
RouteType = Literal["fastest", "economical", "ai_recommended"]


# ---- Core entities ---------------------------------------------------------
class RoadSegment(BaseModel):
    id: int
    name: str
    code: str
    segment_type: str
    length_km: float
    lanes: int
    speed_limit_kmh: int
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    geometry: list[list[float]]


class TrafficReading(BaseModel):
    id: int
    segment_id: int
    ts: datetime
    avg_speed_kmh: float
    vehicle_count: int
    occupancy_pct: float
    congestion_label: CongestionLabel
    rain_flag: bool
    fog_flag: bool
    event_nearby: bool
    accident_nearby: bool


# ---- Prediction ------------------------------------------------------------
class PredictRequest(BaseModel):
    segment_id: int
    # Optional context overrides; if omitted, the latest reading is used.
    rain_flag: Optional[bool] = None
    fog_flag: Optional[bool] = None
    event_nearby: Optional[bool] = None
    accident_nearby: Optional[bool] = None
    at: Optional[datetime] = None


class Probabilities(BaseModel):
    Low: float = 0
    Medium: float = 0
    High: float = 0
    Critical: float = 0


class PredictResponse(BaseModel):
    segment_id: int
    segment_name: str
    congestion_label: CongestionLabel
    confidence: float
    probabilities: Probabilities
    risk_score: float = Field(ge=0, le=100)
    forecast_minutes: int = 45


# ---- Stats / KPIs ----------------------------------------------------------
class StatsResponse(BaseModel):
    avg_speed_kmh: float
    active_incidents: int
    alert_count: int
    operational_efficiency_pct: float
    monitored_segments: int
    sensors_offline: int
    total_vehicles_today: int
    city_risk_score: float


# ---- Routes ----------------------------------------------------------------
class TollPlaza(BaseModel):
    name: str
    segment: str
    cost: float


class RouteOption(BaseModel):
    id: str
    title: str
    route_type: RouteType
    via: str
    eta_minutes: int
    eta_delta: str
    toll_inr: float
    fuel_inr: float
    distance_km: float
    traffic_level: TrafficLevel
    polyline: list[list[float]]
    toll_plazas: list[TollPlaza]
    reason: Optional[str] = None
    score: Optional[float] = None


class RoutesResponse(BaseModel):
    origin: str
    destination: str
    routes: list[RouteOption]


# ---- Alerts ----------------------------------------------------------------
class Alert(BaseModel):
    id: int
    segment_id: Optional[int]
    severity: Severity
    road_name: str
    message: str
    sent_count: int
    is_active: bool
    created_at: datetime
    when: str = ""


class SubscribeRequest(BaseModel):
    city: str = "Delhi NCR"
    radius_km: int = Field(default=5, ge=1, le=25)
    severity_threshold: Severity = "critical"
    push_enabled: bool = True


class SubscribeResponse(BaseModel):
    subscription_id: str
    city: str
    radius_km: int
    severity_threshold: Severity
    push_enabled: bool


# ---- Emergency -------------------------------------------------------------
class EmergencyRequest(BaseModel):
    vehicle_type: Literal["ambulance", "fire", "police"] = "ambulance"
    origin: str
    destination: str


class SignalJunction(BaseModel):
    name: str
    command: str
    offset: str
    state: Literal["cleared", "staged", "pending"]


class EmergencyResponse(BaseModel):
    vehicle_type: str
    origin: str
    destination: str
    polyline: list[list[float]]
    distance_km: float
    eta_with_clearance_min: float
    eta_without_clearance_min: float
    time_saved_min: float
    junctions: list[SignalJunction]
    advisory: str


# ---- Chat ------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
