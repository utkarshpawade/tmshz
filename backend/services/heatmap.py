"""Heatmap service — GeoJSON FeatureCollection of segment congestion."""
from __future__ import annotations

from typing import Any

from ml.inference import model_ready
from services import predictions, repo

# congestion label -> road colour (matches the design tokens)
COLOR_BY_LABEL = {
    "Low": "#5FB95F",
    "Medium": "#E0A53C",
    "High": "#DB4B45",
    "Critical": "#9F2F2B",
}


def _midpoint(geometry: list[list[float]]) -> tuple[float, float]:
    mid = geometry[len(geometry) // 2]
    return float(mid[0]), float(mid[1])


def build_heatmap() -> dict[str, Any]:
    """Return a GeoJSON FeatureCollection plus a high_risk_zones list."""
    segments = repo.get_all_segments()
    latest = repo.get_latest_readings_all()

    features: list[dict[str, Any]] = []
    for seg in segments:
        lr = latest.get(seg["id"]) or {}
        label = lr.get("congestion_label", "Low")
        # geometry stored as [lat,lng]; GeoJSON wants [lng,lat]
        coords = [[float(lng), float(lat)] for lat, lng in seg["geometry"]]
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {
                "segment_id": seg["id"],
                "name": seg["name"],
                "code": seg["code"],
                "segment_type": seg["segment_type"],
                "congestion_label": label,
                "occupancy_pct": float(lr.get("occupancy_pct", 0)),
                "avg_speed_kmh": float(lr.get("avg_speed_kmh", 0)),
                "vehicle_count": int(lr.get("vehicle_count", 0)),
                "color": COLOR_BY_LABEL.get(label, "#5FB95F"),
            },
        })

    # ---- high-risk zones : top 3 by predicted 45-min risk score -----------
    high_risk: list[dict[str, Any]] = []
    if model_ready():
        preds = predictions.predict_all_segments(store=False)
        seg_by_id = {s["id"]: s for s in segments}
        preds.sort(key=lambda p: p["risk_score"], reverse=True)
        for p in preds[:3]:
            seg = seg_by_id.get(p["segment_id"])
            if not seg:
                continue
            lat, lng = _midpoint(seg["geometry"])
            risk = p["risk_score"]
            high_risk.append({
                "segment_id": p["segment_id"],
                "name": seg["name"],
                "risk_score": risk,
                "congestion_label": p["congestion_label"],
                "confidence": p["confidence"],
                "eta_peak_min": max(8, int(60 - risk * 0.5)),
                "direction": "rising" if risk >= 60 else "falling",
                "lat": lat,
                "lng": lng,
            })

    return {
        "type": "FeatureCollection",
        "features": features,
        "high_risk_zones": high_risk,
    }
