"""
Rule-based TrafficBot.

No LLM / API key — replies are assembled from canned templates filled with
live traffic context pulled from the same seeded database the dashboard uses.
Always suggests an alternative route when congestion is high.
"""
from __future__ import annotations

from typing import Any

from db.database import query_all, query_one
from services import repo


def _context() -> dict[str, Any]:
    """Pull a compact live snapshot of Delhi NCR traffic."""
    latest = repo.get_latest_readings_all()
    segs = {s["id"]: s for s in repo.get_all_segments()}

    rows = []
    for sid, r in latest.items():
        seg = segs.get(sid)
        if not seg:
            continue
        rows.append({
            "name": seg["name"],
            "occupancy": float(r["occupancy_pct"]),
            "speed": float(r["avg_speed_kmh"]),
            "label": r["congestion_label"],
        })
    rows.sort(key=lambda x: x["occupancy"], reverse=True)

    avg_speed = round(sum(x["speed"] for x in rows) / len(rows), 1) if rows else 0
    avg_occ = round(sum(x["occupancy"] for x in rows) / len(rows), 1) if rows else 0

    crit = query_one(
        "select road_name, message from alerts "
        "where is_active and severity in ('critical','high') "
        "order by created_at desc limit 1"
    )
    return {
        "rows": rows,
        "heaviest": rows[0] if rows else None,
        "lightest": rows[-1] if rows else None,
        "avg_speed": avg_speed,
        "avg_occ": avg_occ,
        "top_alert": crit,
    }


def _find_road(message: str, ctx: dict) -> dict | None:
    msg = message.lower()
    for row in ctx["rows"]:
        name = row["name"].lower()
        if name in msg:
            return row
        # match on distinctive keyword (first word of the road name)
        key = name.split()[0]
        if len(key) > 3 and key in msg:
            return row
    for key in ("nh-48", "nh48", "dnd", "mg road", "ring road", "noida"):
        if key in msg:
            for row in ctx["rows"]:
                if key.replace("-", "").replace(" ", "") in row["name"].lower().replace("-", "").replace(" ", ""):
                    return row
    return None


def generate_reply(message: str) -> str:
    """Return TrafficBot's full reply text for a user message."""
    ctx = _context()
    msg = message.lower().strip()

    if not msg:
        return "Ask me about live conditions, ETAs, or congestion risk across Delhi NCR."

    # 1. specific road query
    road = _find_road(message, ctx)
    if road:
        reply = (
            f"{road['name']} is {road['label'].lower()} right now — average speed "
            f"{road['speed']:.0f} km/h, occupancy {road['occupancy']:.0f}%."
        )
        if road["occupancy"] >= 65:
            light = ctx["lightest"]
            reply += (
                f" Heavy load — consider rerouting via {light['name']} "
                f"({light['speed']:.0f} km/h, flowing well)."
            )
        return reply

    # 2. risk / forecast
    if any(k in msg for k in ("risk", "forecast", "predict", "hotspot")):
        h = ctx["heaviest"]
        top3 = ctx["rows"][:3]
        zones = ", ".join(f"{r['name']} ({r['occupancy']:.0f}%)" for r in top3)
        return (
            f"City-wide congestion is averaging {ctx['avg_occ']:.0f}%. "
            f"Highest-risk corridors: {zones}. {h['name']} is the one to watch — "
            f"reroute early if you're heading that way."
        )

    # 3. route / fastest / eta
    if any(k in msg for k in ("route", "fastest", "eta", "how long", "best way", "saket", "gurgaon", "cyber")):
        return (
            "Connaught Place → Cyber City: the AI Recommended route via Inner Ring "
            "→ Dhaula Kuan → NH-48 is currently best — ~41 min, ₹115 toll, ₹296 fuel. "
            "It saves ~9 min over the fastest route, which is in surge near IFFCO Chowk."
        )

    # 4. alerts
    if any(k in msg for k in ("alert", "incident", "accident", "warning")):
        a = ctx["top_alert"]
        if a:
            return (
                f"Top active advisory — {a['road_name']}: {a['message']} "
                "Check the Alert Center for the full live feed."
            )
        return "No critical advisories active right now. Conditions are stable across Delhi NCR."

    # 5. speed / general conditions
    if any(k in msg for k in ("speed", "traffic", "condition", "how is", "status", "now")):
        h = ctx["heaviest"]
        return (
            f"Across Delhi NCR average speed is {ctx['avg_speed']:.0f} km/h with "
            f"{ctx['avg_occ']:.0f}% mean occupancy. {h['name']} is the heaviest "
            f"corridor ({h['label']}). Most arterials are moving steadily."
        )

    # 6. fallback
    h = ctx["heaviest"]
    return (
        f"I track live Delhi NCR congestion. Right now {h['name']} is busiest "
        f"({h['label']}, {h['speed']:.0f} km/h). Ask me about a specific road, "
        "the risk forecast, the fastest route, or active alerts."
    )
