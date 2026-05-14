"""
POST /api/simulate-rush -- demo scenario hook.

Spikes MG Road + adjacent corridors so the dashboard, heatmap, predictions,
and live WebSocket tick all reflect the surge within one cycle. Fires a
fresh critical alert so the Alert Center feed shows the scenario.
"""
from fastapi import APIRouter

from db.database import execute
from services.live import trigger_friday_rush

router = APIRouter(tags=["simulate"])


SPIKED = [
    # name,                          occupancy, speed (km/h), label
    ("MG Road Corridor",             92.0,  12.0, "Critical"),
    ("NH-48 Gurgaon",                84.0,  14.0, "High"),
    ("IFFCO Chowk Junction",         95.0,   8.0, "Critical"),
    ("Dhaula Kuan Junction",         78.0,  16.0, "High"),
]


@router.post("/simulate-rush")
def simulate_rush() -> dict:
    # 1) push the in-memory live-sim state so the WebSocket tick spikes immediately
    trigger_friday_rush()

    # 2) insert fresh "now" readings so /stats, /heatmap, /predict all reflect the spike
    affected: list[str] = []
    for name, occ, speed, label in SPIKED:
        try:
            execute(
                """
                insert into traffic_readings
                  (segment_id, ts, avg_speed_kmh, vehicle_count, occupancy_pct,
                   congestion_label, rain_flag, fog_flag, event_nearby, accident_nearby)
                select id, now(), %s, %s, %s, %s, false, false, true, false
                from road_segments where name = %s
                """,
                (speed, int(160 + occ * 4), occ, label, name),
            )
            affected.append(name)
        except Exception:
            pass

    # 3) fire a critical alert tied to the scenario
    try:
        execute(
            """
            insert into alerts (severity, road_name, message, sent_count, is_active)
            values (%s, %s, %s, %s, %s)
            """,
            (
                "critical", "MG Road · Corridor MG-7",
                "Friday rush simulation: 92% congestion predicted in 8 min. "
                "Reroute via Inner Ring → Dhaula Kuan.",
                8400, True,
            ),
        )
    except Exception:
        pass

    return {
        "status": "ok",
        "scenario": "friday_rush",
        "affected": affected,
        "message": "Friday rush scenario active -- live tick, dashboard KPIs, and alert feed all spike within one cycle.",
    }
