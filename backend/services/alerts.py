"""Alert center service — feed, history, and push subscriptions."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from db.database import query_all, query_one


def _relative(ts: datetime) -> str:
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    secs = max(0, int((now - ts).total_seconds()))
    if secs < 60:
        return f"{secs}s ago"
    if secs < 3600:
        return f"{secs // 60}m ago"
    if secs < 86400:
        return f"{secs // 3600}h ago"
    return f"{secs // 86400}d ago"


def list_alerts(severity: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Return alerts newest-first, optionally filtered by severity."""
    if severity and severity != "all":
        rows = query_all(
            """
            select id, segment_id, severity, road_name, message, sent_count,
                   is_active, created_at
            from alerts where severity = %s
            order by created_at desc limit %s
            """,
            (severity, limit),
        )
    else:
        rows = query_all(
            """
            select id, segment_id, severity, road_name, message, sent_count,
                   is_active, created_at
            from alerts order by created_at desc limit %s
            """,
            (limit,),
        )
    for r in rows:
        r["when"] = _relative(r["created_at"])
    return rows


def create_subscription(payload: dict[str, Any]) -> dict[str, Any]:
    """Insert a push subscription and return it with a mock subscription_id."""
    sub_id = "sub_" + secrets.token_hex(8)
    row = query_one(
        """
        insert into alert_subscriptions
          (subscription_id, city, radius_km, severity_threshold, push_enabled)
        values (%s,%s,%s,%s,%s)
        returning subscription_id, city, radius_km, severity_threshold, push_enabled
        """,
        (
            sub_id,
            payload.get("city", "Delhi NCR"),
            payload.get("radius_km", 5),
            payload.get("severity_threshold", "critical"),
            payload.get("push_enabled", True),
        ),
    )
    return row
