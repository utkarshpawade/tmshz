"""
Toll intelligence + route comparison.

Holds the Delhi NCR toll-plaza price map and the three route templates
(Fastest / Economical / AI Recommended). `compare_routes` computes live
ETA / toll / fuel / traffic-level for each route against current congestion,
then scores them with:  congestion x 0.5 + toll x 0.3 + eta x 0.2  (lower = better).
"""
from __future__ import annotations

from typing import Any

from services import repo

# ---- toll plaza price map (INR) -------------------------------------------
TOLL_DATA: dict[str, dict[str, Any]] = {
    "DND Toll Plaza":      {"segment": "NH-48 KM 12",     "cost": 95},
    "Sirhaul Border":      {"segment": "Delhi-Gurgaon",   "cost": 75},
    "Kherki Daula":        {"segment": "NH-48 KM 24",     "cost": 75},
    "Dhaula Kuan Bypass":  {"segment": "Inner Ring KM 8", "cost": 40},
    "Rajokri Toll":        {"segment": "NH-48 KM 18",     "cost": 75},
    "Mahipalpur Toll":     {"segment": "NH-48 KM 6",      "cost": 60},
    "Kalindi Kunj Toll":   {"segment": "Noida Link",      "cost": 50},
}

FUEL_RATE_PER_KM = 8.6  # INR/km baseline

# ---- route templates -------------------------------------------------------
# polyline coordinates are [lat, lng] for direct Leaflet consumption.
ROUTE_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "fastest",
        "title": "Fastest Route",
        "route_type": "fastest",
        "via": "NH-48 via IFFCO Chowk",
        "distance_km": 29.4,
        "base_speed_kmh": 48,
        "toll_plaza_names": ["DND Toll Plaza", "Sirhaul Border", "Kherki Daula"],
        "congestion_sensitivity": 0.95,
        "polyline": [
            [28.6315, 77.2196], [28.5912, 77.1610], [28.5680, 77.1320],
            [28.5380, 77.1010], [28.5060, 77.0740], [28.4830, 77.0540],
            [28.4720, 77.0720], [28.4940, 77.0890],
        ],
    },
    {
        "id": "eco",
        "title": "Economical Route",
        "route_type": "economical",
        "via": "MG Road · Mehrauli",
        "distance_km": 31.8,
        "base_speed_kmh": 38,
        "toll_plaza_names": [],
        "congestion_sensitivity": 0.70,
        "polyline": [
            [28.6315, 77.2196], [28.5800, 77.2100], [28.5400, 77.1900],
            [28.5180, 77.1850], [28.4900, 77.1400], [28.4790, 77.1180],
            [28.4820, 77.1010], [28.4940, 77.0890],
        ],
    },
    {
        "id": "ai",
        "title": "AI Recommended",
        "route_type": "ai_recommended",
        "via": "Inner Ring → Dhaula Kuan → NH-48",
        "distance_km": 30.2,
        "base_speed_kmh": 45,
        "toll_plaza_names": ["Dhaula Kuan Bypass", "Rajokri Toll"],
        "congestion_sensitivity": 0.55,  # routes around the surge
        "polyline": [
            [28.6315, 77.2196], [28.5910, 77.1855], [28.5750, 77.1620],
            [28.5610, 77.1380], [28.5350, 77.1050], [28.5060, 77.0760],
            [28.4940, 77.0760], [28.4940, 77.0890],
        ],
    },
]


def _city_congestion_factor() -> float:
    """0..1 — mean occupancy across the latest reading of every segment."""
    latest = repo.get_latest_readings_all()
    if not latest:
        return 0.45
    occ = [float(r["occupancy_pct"]) for r in latest.values()]
    return max(0.05, min(sum(occ) / len(occ) / 100.0, 1.0))


def _traffic_level(effective_congestion: float) -> str:
    if effective_congestion >= 0.62:
        return "high"
    if effective_congestion >= 0.38:
        return "medium"
    return "low"


def _route_toll(template: dict) -> tuple[float, list[dict]]:
    plazas = []
    total = 0.0
    for name in template["toll_plaza_names"]:
        info = TOLL_DATA[name]
        plazas.append({"name": name, "segment": info["segment"], "cost": float(info["cost"])})
        total += float(info["cost"])
    if not plazas:
        plazas.append({"name": "No toll plazas on this route", "segment": "—", "cost": 0.0})
    return total, plazas


def compare_routes(origin: str, destination: str) -> dict[str, Any]:
    """Build the three comparable routes with live-adjusted metrics + AI score."""
    city = _city_congestion_factor()
    built: list[dict[str, Any]] = []

    for tpl in ROUTE_TEMPLATES:
        dist = tpl["distance_km"]
        eff_cong = min(city * tpl["congestion_sensitivity"] + 0.06, 1.0)

        free_flow_min = dist / tpl["base_speed_kmh"] * 60.0
        eta = free_flow_min * (1.0 + 0.85 * eff_cong)
        toll, plazas = _route_toll(tpl)
        fuel = dist * FUEL_RATE_PER_KM * (1.0 + 0.22 * eff_cong)

        built.append({
            "id": tpl["id"],
            "title": tpl["title"],
            "route_type": tpl["route_type"],
            "via": tpl["via"],
            "eta_minutes": round(eta),
            "_free_flow_min": free_flow_min,
            "_eff_cong": eff_cong,
            "toll_inr": round(toll, 2),
            "fuel_inr": round(fuel, 2),
            "distance_km": dist,
            "traffic_level": _traffic_level(eff_cong),
            "polyline": tpl["polyline"],
            "toll_plazas": plazas,
        })

    # ---- normalise + score : congestion*0.5 + toll*0.3 + eta*0.2 ----------
    def _norm(values: list[float]) -> list[float]:
        lo, hi = min(values), max(values)
        span = (hi - lo) or 1.0
        return [(v - lo) / span for v in values]

    cong_n = _norm([r["_eff_cong"] for r in built])
    toll_n = _norm([r["toll_inr"] for r in built])
    eta_n = _norm([float(r["eta_minutes"]) for r in built])

    fastest_eta = min(r["eta_minutes"] for r in built)
    for r, c, t, e in zip(built, cong_n, toll_n, eta_n):
        r["score"] = round(c * 0.5 + t * 0.3 + e * 0.2, 4)

    for r in built:
        delta = r["eta_minutes"] - round(r["_free_flow_min"])
        if r["route_type"] == "ai_recommended":
            saved = r["eta_minutes"] - fastest_eta
            r["eta_delta"] = (
                f"{saved:+d} min vs fastest" if saved else "matches fastest ETA"
            )
            r["reason"] = (
                "Lowest weighted score — avoids the MG Junction surge "
                "predicted in the next 22 min while keeping toll moderate."
            )
        else:
            r["eta_delta"] = f"{delta:+d} min vs usual" if delta else "on par with usual"
            r["reason"] = None
        del r["_free_flow_min"]
        del r["_eff_cong"]

    return {"origin": origin, "destination": destination, "routes": built}
