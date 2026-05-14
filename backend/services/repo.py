"""Shared read helpers over the seeded database."""
from __future__ import annotations

from typing import Any

from db.database import query_all, query_one

SEGMENT_COLS = (
    "id, name, code, segment_type, length_km, lanes, speed_limit_kmh, "
    "start_lat, start_lng, end_lat, end_lng, geometry"
)
READING_COLS = (
    "ts, avg_speed_kmh, vehicle_count, occupancy_pct, congestion_label, "
    "rain_flag, fog_flag, event_nearby, accident_nearby"
)


def get_all_segments() -> list[dict[str, Any]]:
    return query_all(f"select {SEGMENT_COLS} from road_segments order by id")


def get_segment(segment_id: int) -> dict[str, Any] | None:
    return query_one(
        f"select {SEGMENT_COLS} from road_segments where id = %s", (segment_id,)
    )


def get_recent_readings(segment_id: int, limit: int = 6) -> list[dict[str, Any]]:
    """Return the most recent `limit` readings for a segment, oldest -> newest."""
    return query_all(
        f"""
        select {READING_COLS} from (
            select {READING_COLS}
            from traffic_readings
            where segment_id = %s
            order by ts desc
            limit %s
        ) sub
        order by ts asc
        """,
        (segment_id, limit),
    )


def get_latest_reading(segment_id: int) -> dict[str, Any] | None:
    return query_one(
        f"""
        select {READING_COLS} from traffic_readings
        where segment_id = %s order by ts desc limit 1
        """,
        (segment_id,),
    )


def get_latest_readings_all() -> dict[int, dict[str, Any]]:
    """Latest reading per segment, keyed by segment_id."""
    rows = query_all(
        f"""
        select distinct on (segment_id) segment_id, {READING_COLS}
        from traffic_readings
        order by segment_id, ts desc
        """
    )
    return {r["segment_id"]: r for r in rows}


def get_max_ts():
    row = query_one("select max(ts) as m from traffic_readings")
    return row["m"] if row else None
