"""
TrafficBot -- LLM-powered chatbot via Groq (Llama 3.3 70B by default).

Falls back to the legacy rule-based replies if GROQ_API_KEY is not set so
the demo still works offline. Streams tokens for both paths.
"""
from __future__ import annotations

import json
from typing import Any, AsyncIterator

from config import settings
from db.database import query_all, query_one
from services import repo


SYSTEM_PROMPT = """You are TrafficBot, the dispatch assistant for a Delhi NCR smart traffic
command center. You have direct access to live sensor readings, ML-based
congestion forecasts (XGBoost, 45-min lookahead), and active alerts.

STYLE:
- Concise (1-3 sentences). No greetings or fluff. No emojis.
- Always speak in present tense and use rupees (Rs.) + km/h where relevant.
- When you cite a road, occupancy, speed, or risk, pull it from the
  CONTEXT_JSON that the system gives you below. Do NOT invent numbers.
- If the user asks about a road that is not in CONTEXT_JSON, say so plainly
  and recommend the closest match you do have.
- For route requests, prefer the AI Recommended option and explain why
  (saves X min, avoids surge at Y).
- For alerts, summarise severity + cause + recommended action.

You are speaking to a dispatch operator, not the general public. Be direct.
"""


def _build_context() -> dict[str, Any]:
    """Pull a compact live snapshot of Delhi NCR traffic for the LLM."""
    rows = []
    try:
        latest = repo.get_latest_readings_all()
        segs = {s["id"]: s for s in repo.get_all_segments()}
        for sid, r in latest.items():
            seg = segs.get(sid)
            if not seg:
                continue
            rows.append({
                "name": seg["name"],
                "type": seg["segment_type"],
                "occupancy_pct": round(float(r["occupancy_pct"]), 1),
                "avg_speed_kmh": round(float(r["avg_speed_kmh"]), 1),
                "label": r["congestion_label"],
            })
        rows.sort(key=lambda x: x["occupancy_pct"], reverse=True)
    except Exception:
        pass

    avg_speed = round(sum(x["avg_speed_kmh"] for x in rows) / len(rows), 1) if rows else 0
    avg_occ = round(sum(x["occupancy_pct"] for x in rows) / len(rows), 1) if rows else 0

    top_alert = None
    try:
        top_alert = query_one(
            "select road_name, message, severity from alerts "
            "where is_active and severity in ('critical','high') "
            "order by created_at desc limit 1"
        )
    except Exception:
        pass

    recent_alerts = []
    try:
        recent_alerts = query_all(
            "select severity, road_name, message from alerts "
            "where is_active order by created_at desc limit 5"
        )
    except Exception:
        pass

    return {
        "city": "Delhi NCR",
        "segments": rows,
        "heaviest": rows[0] if rows else None,
        "lightest": rows[-1] if rows else None,
        "avg_speed_kmh": avg_speed,
        "avg_occupancy_pct": avg_occ,
        "top_alert": top_alert,
        "recent_alerts": recent_alerts,
    }


# ---------------------------------------------------------------------------
# Rule-based fallback (legacy)
# ---------------------------------------------------------------------------
def _rule_based_reply(message: str, ctx: dict[str, Any]) -> str:
    msg = message.lower().strip()
    rows = ctx.get("segments", [])

    if not msg:
        return "Ask me about live conditions, ETAs, or congestion risk across Delhi NCR."

    def find_road():
        for row in rows:
            if row["name"].lower() in msg:
                return row
        for key in ("nh-48", "nh48", "dnd", "mg road", "ring road", "noida"):
            if key in msg:
                for row in rows:
                    if key.replace("-", "").replace(" ", "") in row["name"].lower().replace("-", "").replace(" ", ""):
                        return row
        return None

    road = find_road()
    if road:
        reply = (
            f"{road['name']} is {road['label'].lower()} right now -- "
            f"{road['avg_speed_kmh']:.0f} km/h, occupancy {road['occupancy_pct']:.0f}%."
        )
        if road["occupancy_pct"] >= 65 and ctx.get("lightest"):
            light = ctx["lightest"]
            reply += f" Reroute via {light['name']} ({light['avg_speed_kmh']:.0f} km/h)."
        return reply

    if any(k in msg for k in ("risk", "forecast", "predict", "hotspot")):
        h = ctx.get("heaviest")
        zones = ", ".join(f"{r['name']} ({r['occupancy_pct']:.0f}%)" for r in rows[:3])
        return (
            f"City-wide occupancy {ctx['avg_occupancy_pct']:.0f}%. "
            f"Top zones: {zones}. {h['name'] if h else 'MG Road'} is the watchpoint."
        )

    if any(k in msg for k in ("route", "fastest", "eta", "best way", "saket", "gurgaon", "cyber")):
        return (
            "Connaught Place -> Cyber City: AI Recommended is Inner Ring -> Dhaula Kuan -> NH-48, "
            "~41 min, Rs. 115 toll. Saves ~9 min vs the fastest route currently in surge."
        )

    if any(k in msg for k in ("alert", "incident", "accident", "warning")):
        a = ctx.get("top_alert")
        if a:
            return f"Top advisory -- {a['road_name']}: {a['message']}"
        return "No critical advisories active right now."

    h = ctx.get("heaviest")
    return (
        f"Delhi NCR average speed {ctx['avg_speed_kmh']:.0f} km/h. "
        f"Heaviest corridor: {h['name'] if h else 'MG Road'}. Ask about a specific road, the risk forecast, or active alerts."
    )


# ---------------------------------------------------------------------------
# Groq-backed reply (preferred)
# ---------------------------------------------------------------------------
async def stream_reply(message: str) -> AsyncIterator[str]:
    """Yield reply chunks. Uses Groq if configured, else rule-based."""
    ctx = _build_context()

    if not settings.has_groq:
        # Stream the rule-based reply word-by-word for a consistent UX
        text = _rule_based_reply(message, ctx)
        words = text.split(" ")
        for i, w in enumerate(words):
            import asyncio
            yield (" " + w) if i > 0 else w
            await asyncio.sleep(0.025)
        return

    try:
        from groq import AsyncGroq
    except Exception:
        # SDK missing -- fall back
        text = _rule_based_reply(message, ctx)
        for w in text.split(" "):
            yield w + " "
        return

    client = AsyncGroq(api_key=settings.groq_api_key)

    # Trim context to keep token usage low
    compact_ctx = {
        "avg_speed_kmh": ctx.get("avg_speed_kmh"),
        "avg_occupancy_pct": ctx.get("avg_occupancy_pct"),
        "heaviest": ctx.get("heaviest"),
        "lightest": ctx.get("lightest"),
        "top_alert": ctx.get("top_alert"),
        "segments": ctx.get("segments", [])[:8],
    }

    system_msg = SYSTEM_PROMPT + "\n\nCONTEXT_JSON:\n" + json.dumps(compact_ctx, default=str)

    try:
        stream = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": message},
            ],
            temperature=0.2,
            max_tokens=300,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta
    except Exception as e:
        # Network/auth failure -> degrade gracefully
        fallback = _rule_based_reply(message, ctx)
        yield fallback + f"\n\n[LLM unavailable: {type(e).__name__}]"


def generate_reply(message: str) -> str:
    """Legacy sync API -- kept for backwards compatibility (non-streaming)."""
    ctx = _build_context()
    return _rule_based_reply(message, ctx)
