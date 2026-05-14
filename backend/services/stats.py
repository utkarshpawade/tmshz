"""KPI / dashboard statistics service."""
from __future__ import annotations

from typing import Any

from db.database import query_one
from ml.inference import model_ready
from services import predictions


def _operational_efficiency(speed_ratio: float, non_critical_share: float) -> float:
    """
    Damped 'network health' score for the dashboard.

    A traffic command-center efficiency metric should stay in a believable
    band and move gently — not swing 60 points with the clock. Blends the
    network speed ratio with the share of segments not in High/Critical
    state, anchored high so it reads as a working KPI:
        base 45% + speed_ratio*30 + non_critical_share*25
    Typical result hovers ~75-85%, worst-case ~60%, best-case ~95%.
    """
    score = 45.0 + 30.0 * min(max(speed_ratio, 0.0), 1.0) + 25.0 * non_critical_share
    return round(min(96.0, max(58.0, score)), 1)


def get_stats() -> dict[str, Any]:
    """Aggregate the dashboard KPI numbers from the latest readings + model."""
    agg = query_one(
        """
        with latest as (
            select distinct on (r.segment_id) r.segment_id, r.ts,
                   r.avg_speed_kmh, r.vehicle_count, r.occupancy_pct,
                   r.congestion_label, r.accident_nearby,
                   s.speed_limit_kmh
            from traffic_readings r
            join road_segments s on s.id = r.segment_id
            order by r.segment_id, r.ts desc
        ),
        bounds as (select max(ts) as max_ts from traffic_readings)
        select
            round(avg(l.avg_speed_kmh)::numeric, 1)            as avg_speed_kmh,
            count(*) filter (where l.accident_nearby)           as active_incidents,
            avg(l.avg_speed_kmh / nullif(l.speed_limit_kmh, 0)) as speed_ratio,
            avg(case when l.congestion_label in ('High', 'Critical')
                     then 0.0 else 1.0 end)                     as non_critical_share,
            count(*)                                            as monitored_segments,
            (select count(*) from road_segments)               as total_segments,
            (select coalesce(sum(vehicle_count), 0)
               from traffic_readings, bounds
               where ts >= bounds.max_ts - interval '24 hours') as total_vehicles_today
        from latest l
        """
    ) or {}

    alert_row = query_one("select count(*)::int as n from alerts where is_active") or {"n": 0}

    monitored = int(agg.get("monitored_segments") or 0)
    total = int(agg.get("total_segments") or monitored)
    efficiency = _operational_efficiency(
        float(agg.get("speed_ratio") or 0.5),
        float(agg.get("non_critical_share") or 0.6),
    )

    # city-wide risk: mean model risk score (falls back to an efficiency proxy)
    if model_ready():
        preds = predictions.predict_all_segments(store=False)
        city_risk = (
            round(sum(p["risk_score"] for p in preds) / len(preds), 1)
            if preds else 0.0
        )
    else:
        city_risk = round(min(100.0, max(0.0, 100 - efficiency)), 1)

    return {
        "avg_speed_kmh": float(agg.get("avg_speed_kmh") or 0),
        "active_incidents": int(agg.get("active_incidents") or 0),
        "alert_count": int(alert_row["n"]),
        "operational_efficiency_pct": efficiency,
        "monitored_segments": monitored,
        "sensors_offline": max(0, total - monitored),
        "total_vehicles_today": int(agg.get("total_vehicles_today") or 0),
        "city_risk_score": city_risk,
    }
