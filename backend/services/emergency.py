"""Emergency vehicle routing — priority corridor + signal pre-emption."""
from __future__ import annotations

from typing import Any

# Cascading signal pre-emption plan along the AIIMS -> Saket corridor.
JUNCTIONS: list[dict[str, Any]] = [
    {"name": "AIIMS Junction",      "command": "Hold green · East-West",     "offset": "0 s",   "state": "cleared"},
    {"name": "Safdarjung Crossing", "command": "Pre-empt · 38 s lead",       "offset": "+38 s", "state": "cleared"},
    {"name": "INA Market",          "command": "Block left turn",            "offset": "+1:22", "state": "cleared"},
    {"name": "Yusuf Sarai Flyover", "command": "Coordinate cycle · 2 phases","offset": "+2:04", "state": "staged"},
    {"name": "Hauz Khas Underpass", "command": "Open green · all approaches","offset": "+3:18", "state": "staged"},
    {"name": "Sheikh Sarai",        "command": "Pre-empt · 28 s lead",       "offset": "+4:32", "state": "pending"},
    {"name": "Saket Citywalk",      "command": "Hold opposing flow",         "offset": "+6:10", "state": "pending"},
]

# AIIMS, Ansari Nagar -> Max Hospital, Saket  ([lat,lng] for Leaflet)
CORRIDOR_POLYLINE = [
    [28.5686, 77.2070], [28.5600, 77.2078], [28.5500, 77.2080],
    [28.5410, 77.2074], [28.5320, 77.2068], [28.5245, 77.2066],
]

# urban free-flow vs priority-cleared average speeds (km/h)
SPEED_WITHOUT = 26.0
SPEED_WITH = 62.0
DISTANCE_KM = 7.8

VEHICLE_LABELS = {
    "ambulance": "ambulance unit AMB-12",
    "fire":      "fire tender FT-04",
    "police":    "police escort PCR-31",
}


def build_emergency_route(
    vehicle_type: str, origin: str, destination: str
) -> dict[str, Any]:
    eta_without = round(DISTANCE_KM / SPEED_WITHOUT * 60.0, 1)
    eta_with = round(DISTANCE_KM / SPEED_WITH * 60.0, 1)
    saved = round(eta_without - eta_with, 1)

    unit = VEHICLE_LABELS.get(vehicle_type, "emergency unit")
    advisory = (
        "Re-route opposing flow at Yusuf Sarai to absorb the 38-second hold "
        "without spillback."
    )

    return {
        "vehicle_type": vehicle_type,
        "origin": origin,
        "destination": destination,
        "polyline": CORRIDOR_POLYLINE,
        "distance_km": DISTANCE_KM,
        "eta_with_clearance_min": eta_with,
        "eta_without_clearance_min": eta_without,
        "time_saved_min": saved,
        "junctions": JUNCTIONS,
        "advisory": f"Priority corridor live · cascading {len(JUNCTIONS)} signals · {unit}. {advisory}",
    }
