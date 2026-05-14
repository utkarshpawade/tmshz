"""
Real route planner backed by TomTom (geocoding + routing) and scored by
Groq Llama 3.3.

Flow:
  1. Geocode origin + destination via TomTom Search API, biased to Delhi NCR.
  2. Call TomTom Routing API three times with different `routeType`s
     (fastest / eco / shortest) plus `traffic=true` for live ETAs.
  3. Compute toll (heuristic: highway routes hit named plazas), fuel,
     congestion factor.
  4. Ask Groq to pick the AI-recommended route and explain why in 1-2 sentences.
  5. Return the same RoutesResponse shape the frontend already renders.

If TomTom is unavailable the caller can fall back to the static templates
in toll_intelligence.compare_routes — preserving the demo offline.
"""
from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote

import httpx

from config import settings
from services.toll_intelligence import TOLL_DATA, FUEL_RATE_PER_KM

# Center of Delhi NCR — used as the geocoding bias point.
NCR_CENTER = (28.6139, 77.2090)
NCR_RADIUS_M = 80_000  # ~Sonipat→Faridabad → Greater Noida

# How to ask TomTom for each of the 3 lanes we show.
_ROUTE_VARIANTS: list[dict[str, Any]] = [
    {
        "id": "fastest",
        "title": "Fastest Route",
        "route_type": "fastest",
        "tomtom_route_type": "fastest",
        "tomtom_extra": {},
        "congestion_sensitivity": 0.95,
    },
    {
        "id": "eco",
        "title": "Economical Route",
        "route_type": "economical",
        "tomtom_route_type": "eco",
        "tomtom_extra": {"avoid": "tollRoads"},
        "congestion_sensitivity": 0.70,
    },
    {
        "id": "ai",
        "title": "AI Recommended",
        "route_type": "ai_recommended",
        "tomtom_route_type": "fastest",
        # Ask for 1 alternative — we'll use the alternative if it's
        # meaningfully different from the primary fastest leg.
        "tomtom_extra": {"maxAlternatives": "1", "alternativeType": "anyRoute"},
        "congestion_sensitivity": 0.55,
    },
]


async def _geocode(query: str, client: httpx.AsyncClient) -> tuple[float, float] | None:
    """Resolve a place name to (lat, lng), biased to Delhi NCR.
    Uses TomTom's fuzzy `search/2/search` endpoint — works for landmarks,
    addresses, and POIs like "Cyber City Gurgaon"."""
    if not settings.has_tomtom or not query.strip():
        return None
    url = f"https://api.tomtom.com/search/2/search/{quote(query.strip(), safe='')}.json"
    params = {
        "key": settings.tomtom_key,
        "countrySet": "IN",
        "lat": NCR_CENTER[0],
        "lon": NCR_CENTER[1],
        "radius": NCR_RADIUS_M,
        "limit": 1,
        "typeahead": "false",
    }
    try:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            return None
        data = r.json()
        results = data.get("results") or []
        if not results:
            return None
        pos = results[0].get("position") or {}
        lat, lon = pos.get("lat"), pos.get("lon")
        if lat is None or lon is None:
            return None
        return (float(lat), float(lon))
    except Exception:
        return None


async def _tomtom_route(
    start: tuple[float, float],
    end: tuple[float, float],
    route_type: str,
    extra: dict[str, Any],
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Call TomTom Routing API and return the primary route dict."""
    if not settings.has_tomtom:
        return None
    locs = f"{start[0]},{start[1]}:{end[0]},{end[1]}"
    url = f"https://api.tomtom.com/routing/1/calculateRoute/{locs}/json"
    params = {
        "key": settings.tomtom_key,
        "routeType": route_type,
        "traffic": "true",
        "travelMode": "car",
        "instructionsType": "text",
        "language": "en-GB",
        **extra,
    }
    try:
        r = await client.get(url, params=params)
        if r.status_code != 200:
            return None
        return r.json()
    except Exception:
        return None


def _summarize_route(route: dict[str, Any]) -> dict[str, Any]:
    """Pull the bits we care about from a TomTom route dict."""
    summary = route.get("summary") or {}
    legs = route.get("legs") or []
    points: list[list[float]] = []
    for leg in legs:
        for p in leg.get("points") or []:
            lat = p.get("latitude")
            lng = p.get("longitude")
            if lat is not None and lng is not None:
                points.append([float(lat), float(lng)])
    return {
        "length_m": float(summary.get("lengthInMeters") or 0),
        "travel_time_s": float(summary.get("travelTimeInSeconds") or 0),
        "traffic_delay_s": float(summary.get("trafficDelayInSeconds") or 0),
        "departure_time": summary.get("departureTime"),
        "arrival_time": summary.get("arrivalTime"),
        "polyline": _decimate(points, max_points=180),
    }


def _decimate(points: list[list[float]], max_points: int) -> list[list[float]]:
    if len(points) <= max_points:
        return points
    step = len(points) / max_points
    out = [points[int(i * step)] for i in range(max_points)]
    if out[-1] != points[-1]:
        out.append(points[-1])
    return out


def _estimate_tolls(via_label: str, distance_km: float, avoids_tolls: bool) -> tuple[float, list[dict[str, Any]]]:
    """
    Heuristic toll estimator — we don't know the exact plaza set from TomTom's
    free routing API, so we pick a plausible subset by route signature.
    """
    if avoids_tolls or distance_km < 6:
        return 0.0, [{"name": "No toll plazas on this route", "segment": "—", "cost": 0.0}]
    label = via_label.lower()
    plazas: list[str] = []
    if "nh-48" in label or "gurgaon" in label or "manesar" in label:
        plazas = ["DND Toll Plaza", "Sirhaul Border", "Kherki Daula"]
    elif "noida" in label or "kalindi" in label or "dnd" in label:
        plazas = ["DND Toll Plaza", "Kalindi Kunj Toll"]
    elif "dhaula" in label or "ring road" in label or "rajokri" in label:
        plazas = ["Dhaula Kuan Bypass", "Rajokri Toll"]
    else:
        plazas = ["Mahipalpur Toll"]
    out = [{"name": n, "segment": TOLL_DATA[n]["segment"], "cost": float(TOLL_DATA[n]["cost"])} for n in plazas]
    total = sum(p["cost"] for p in out)
    return total, out


def _via_label_from_polyline(points: list[list[float]], distance_km: float) -> str:
    """Cheap human-readable 'via' label based on which Delhi NCR landmarks
    the polyline passes near. Not authoritative — purely for the UI."""
    if not points or len(points) < 3:
        return "Direct route"
    mid = points[len(points) // 2]
    lat, lng = mid[0], mid[1]

    LANDMARKS = [
        ("IFFCO Chowk",      28.4717, 77.0726),
        ("MG Road · Mehrauli", 28.5275, 77.1855),
        ("Dhaula Kuan",      28.5921, 77.1610),
        ("DND Flyway",       28.5790, 77.3045),
        ("Noida Expy",       28.5183, 77.3712),
        ("NH-48 Gurgaon",    28.4595, 77.0266),
        ("Inner Ring Road",  28.6109, 77.1800),
        ("Outer Ring Road",  28.5980, 77.0820),
    ]
    LANDMARKS.sort(key=lambda lm: (lm[1] - lat) ** 2 + (lm[2] - lng) ** 2)
    primary = LANDMARKS[0][0]
    if distance_km > 22:
        secondary = LANDMARKS[1][0]
        return f"{primary} → {secondary}"
    return f"via {primary}"


async def _ai_pick(
    origin_q: str, destination_q: str, routes: list[dict[str, Any]],
) -> tuple[int | None, str | None]:
    """
    Ask Groq to choose the best of the three routes and explain in 1-2
    sentences. Returns (index, reason). Falls back to (None, None) silently
    if Groq isn't configured.
    """
    if not settings.has_groq:
        return None, None
    try:
        from groq import AsyncGroq
    except Exception:
        return None, None

    snapshot = [
        {
            "i": i,
            "title": r["title"],
            "via": r["via"],
            "eta_min": r["eta_minutes"],
            "toll_inr": r["toll_inr"],
            "distance_km": r["distance_km"],
            "traffic": r["traffic_level"],
        }
        for i, r in enumerate(routes)
    ]

    sys = (
        "You are a Delhi NCR dispatch routing assistant. Given three live "
        "candidate routes between two points, choose the BEST one for a "
        "typical passenger trip right now and explain the choice in ONE "
        "sentence (max 220 chars). Optimize for low ETA + low toll, but "
        "prefer routes avoiding heavy traffic. Return ONLY JSON like: "
        '{"pick": 0, "reason": "..."}'
    )
    user = (
        f"Origin: {origin_q}\nDestination: {destination_q}\n"
        f"Routes: {json.dumps(snapshot)}"
    )

    try:
        client = AsyncGroq(api_key=settings.groq_api_key)
        rsp = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[{"role": "system", "content": sys}, {"role": "user", "content": user}],
            temperature=0.2,
            max_tokens=180,
            response_format={"type": "json_object"},
        )
        raw = rsp.choices[0].message.content or "{}"
        data = json.loads(raw)
        pick = data.get("pick")
        reason = data.get("reason")
        if isinstance(pick, int) and 0 <= pick < len(routes) and isinstance(reason, str):
            return pick, reason
    except Exception:
        pass
    return None, None


def _traffic_level(travel_s: float, delay_s: float) -> str:
    if travel_s <= 0:
        return "low"
    ratio = delay_s / travel_s
    if ratio >= 0.30:
        return "high"
    if ratio >= 0.12:
        return "medium"
    return "low"


async def compare_routes_live(origin: str, destination: str) -> dict[str, Any] | None:
    """
    Returns the live RoutesResponse dict if TomTom routing succeeds, else None
    (so the caller can fall back to the static templates).
    """
    if not settings.has_tomtom:
        return None

    async with httpx.AsyncClient(timeout=12.0) as client:
        start = await _geocode(origin, client)
        end = await _geocode(destination, client)
        if not start or not end:
            return None

        # Fire all three TomTom requests
        raw_routes: list[dict[str, Any] | None] = []
        for v in _ROUTE_VARIANTS:
            data = await _tomtom_route(start, end, v["tomtom_route_type"], v["tomtom_extra"], client)
            raw_routes.append(data)

        built: list[dict[str, Any]] = []
        seen_signatures: set[str] = set()

        for variant, data in zip(_ROUTE_VARIANTS, raw_routes):
            if not data:
                continue
            routes = data.get("routes") or []
            if not routes:
                continue
            # For the "AI" lane prefer the alternative (if any) so the three
            # rows aren't all identical when there's only one viable corridor.
            chosen = routes[-1] if (variant["id"] == "ai" and len(routes) > 1) else routes[0]
            s = _summarize_route(chosen)
            if s["length_m"] <= 0:
                continue
            sig = f"{round(s['length_m'])}-{round(s['travel_time_s'])}"
            if sig in seen_signatures and variant["id"] != "ai":
                continue
            seen_signatures.add(sig)

            distance_km = round(s["length_m"] / 1000.0, 1)
            eta_min = max(1, round(s["travel_time_s"] / 60.0))
            via = _via_label_from_polyline(s["polyline"], distance_km)
            avoids_tolls = "tollRoads" in str(variant["tomtom_extra"].get("avoid", ""))
            toll, plazas = _estimate_tolls(via, distance_km, avoids_tolls=avoids_tolls)
            fuel = round(distance_km * FUEL_RATE_PER_KM, 2)
            tlevel = _traffic_level(s["travel_time_s"], s["traffic_delay_s"])

            built.append({
                "id": variant["id"],
                "title": variant["title"],
                "route_type": variant["route_type"],
                "via": via,
                "eta_minutes": eta_min,
                "eta_delta": "",
                "toll_inr": round(toll, 2),
                "fuel_inr": fuel,
                "distance_km": distance_km,
                "traffic_level": tlevel,
                "polyline": s["polyline"],
                "toll_plazas": plazas,
                "reason": None,
                "score": None,
            })

    if not built:
        return None

    # Score: congestion x 0.5 + toll x 0.3 + ETA x 0.2 (lower = better)
    def norm(vals: list[float]) -> list[float]:
        lo, hi = min(vals), max(vals)
        span = (hi - lo) or 1.0
        return [(v - lo) / span for v in vals]

    cong_n = norm([{"low": 0.1, "medium": 0.5, "high": 0.95}[r["traffic_level"]] for r in built])
    toll_n = norm([r["toll_inr"] for r in built])
    eta_n = norm([float(r["eta_minutes"]) for r in built])
    fastest_eta = min(r["eta_minutes"] for r in built)

    for r, c, t, e in zip(built, cong_n, toll_n, eta_n):
        r["score"] = round(c * 0.5 + t * 0.3 + e * 0.2, 4)
        delta = r["eta_minutes"] - fastest_eta
        if r["route_type"] == "ai_recommended":
            r["eta_delta"] = (
                f"{delta:+d} min vs fastest" if delta else "matches fastest ETA"
            )
        else:
            r["eta_delta"] = (
                f"{delta:+d} min vs fastest" if delta else "matches fastest ETA"
            )

    # Let Groq pick + describe the AI recommendation. Falls back to the
    # lowest score if Groq is unavailable.
    pick_idx, ai_reason = await _ai_pick(origin, destination, built)
    if pick_idx is None:
        pick_idx = min(range(len(built)), key=lambda i: built[i]["score"])
    if not ai_reason:
        ai_reason = (
            f"Lowest weighted score — {built[pick_idx]['traffic_level']} traffic, "
            f"Rs.{int(built[pick_idx]['toll_inr'])} toll, "
            f"{built[pick_idx]['eta_minutes']} min ETA."
        )

    # Rebind the AI row to whichever route the model picked, so the UI's
    # "AI Recommended" card always reflects the actual recommendation.
    ai_row = built[pick_idx].copy()
    ai_row.update({
        "id": "ai",
        "title": "AI Recommended",
        "route_type": "ai_recommended",
        "reason": ai_reason,
        "eta_delta": (
            f"{ai_row['eta_minutes'] - fastest_eta:+d} min vs fastest"
            if ai_row["eta_minutes"] != fastest_eta
            else "matches fastest ETA"
        ),
    })

    # Keep only one Fastest, one Economical, plus the AI pick — in that order.
    ordered: list[dict[str, Any]] = []
    seen_types: set[str] = set()
    for row in built:
        if row["route_type"] in ("fastest", "economical") and row["route_type"] not in seen_types:
            row["reason"] = None
            ordered.append(row)
            seen_types.add(row["route_type"])
    ordered.append(ai_row)

    # Make sure we always return exactly 3 rows. If the eco request failed,
    # synthesize a slower variant from the fastest by adding a bit of overhead.
    if len(ordered) < 3:
        base = ordered[0]
        ordered.insert(1, {
            **base,
            "id": "eco",
            "title": "Economical Route",
            "route_type": "economical",
            "via": "Toll-free alternative",
            "eta_minutes": base["eta_minutes"] + 12,
            "toll_inr": 0.0,
            "toll_plazas": [{"name": "No toll plazas on this route", "segment": "—", "cost": 0.0}],
            "fuel_inr": round(base["fuel_inr"] * 1.07, 2),
            "distance_km": round(base["distance_km"] * 1.08, 1),
            "traffic_level": "medium",
            "reason": None,
            "score": base["score"] + 0.1,
        })

    return {"origin": origin, "destination": destination, "routes": ordered[:3]}
