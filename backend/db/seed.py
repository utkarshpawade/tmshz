"""
Synthetic data seeder — 7 days of Delhi NCR traffic readings.

Generates ~96 readings/day (every 15 min) for each of 15 road segments,
with realistic rush-hour curves, weekday/weekend variation, weather flags,
and accident/event spikes. Also seeds a starter set of alerts.

Idempotent: clears existing rows before inserting. Run with:
    python -m db.seed            (from backend/)
or it is invoked automatically by the Docker entrypoint.
"""
from __future__ import annotations

import json
import math
import random
from datetime import datetime, timedelta, timezone

import psycopg

from config import settings
from db.network import SEGMENTS, segment_endpoints

random.seed(42)

DAYS = 7
INTERVAL_MIN = 15
READINGS_PER_DAY = (24 * 60) // INTERVAL_MIN


# --- congestion model --------------------------------------------------------
def rush_factor(hour: float, dow: int) -> float:
    """Return a 0..1 baseline congestion factor for a given hour + weekday."""
    is_weekend = dow >= 5
    if is_weekend:
        # gentle midday bump, calm mornings
        midday = math.exp(-((hour - 14.5) ** 2) / 18)
        evening = math.exp(-((hour - 19) ** 2) / 10) * 0.6
        return 0.18 + 0.45 * midday + 0.35 * evening
    # weekday twin peaks
    morning = math.exp(-((hour - 9.3) ** 2) / 6)
    evening = math.exp(-((hour - 18.3) ** 2) / 7)
    base = 0.15 + 0.7 * morning + 0.78 * evening
    # late-night trough
    if hour < 5:
        base *= 0.35
    return min(base, 1.0)


TYPE_BIAS = {
    "junction": 0.18,    # junctions clog hardest
    "corridor": 0.10,
    "arterial": 0.05,
    "highway": -0.04,    # highways flow a bit freer
}

LABEL_BANDS = [
    (85, "Critical"),
    (65, "High"),
    (40, "Medium"),
    (0, "Low"),
]


def label_for(occupancy: float) -> str:
    for threshold, name in LABEL_BANDS:
        if occupancy >= threshold:
            return name
    return "Low"


def build_readings(segment_id: int, seg: dict, start: datetime) -> list[tuple]:
    rows: list[tuple] = []
    speed_limit = seg["speed_limit_kmh"]
    lanes = seg["lanes"]
    bias = TYPE_BIAS.get(seg["segment_type"], 0.0)
    # each segment gets a stable personality offset
    personality = random.uniform(-0.06, 0.12)

    for i in range(DAYS * READINGS_PER_DAY):
        ts = start + timedelta(minutes=i * INTERVAL_MIN)
        # ts is stored UTC; rush-hour curves are anchored to Delhi local time (IST = UTC+5:30)
        ist = ts + timedelta(hours=5, minutes=30)
        hour = ist.hour + ist.minute / 60.0
        dow = ist.weekday()

        factor = rush_factor(hour, dow) + bias + personality
        factor += random.uniform(-0.08, 0.08)  # sensor noise
        factor = max(0.02, min(factor, 1.05))

        # weather
        rain = random.random() < 0.07
        fog = random.random() < 0.06 and 4 <= ist.hour <= 8
        accident = random.random() < 0.012
        event = random.random() < 0.02

        occupancy = factor * 100
        if rain:
            occupancy += 12
        if fog:
            occupancy += 9
        if accident:
            occupancy += 22
        if event:
            occupancy += 11
        occupancy = max(3.0, min(occupancy, 99.0))

        # speed falls as occupancy rises; floor ~8 km/h
        speed = speed_limit * (1.0 - 0.82 * (occupancy / 100.0))
        speed = max(8.0, speed + random.uniform(-3, 3))

        # vehicle throughput per 15-min window
        vehicles = int(lanes * (28 + occupancy * 1.6) + random.uniform(-30, 30))
        vehicles = max(0, vehicles)

        rows.append((
            segment_id, ts, round(speed, 1), vehicles, round(occupancy, 1),
            label_for(occupancy), rain, fog, event, accident,
        ))
    return rows


# --- starter alerts ----------------------------------------------------------
STARTER_ALERTS = [
    ("high", "NH-48 · IFFCO Chowk", "Multi-vehicle pile-up on inner lane. Expect 25-min delay.", 12100, 1),
    ("critical", "DND Flyway · Mahamaya", "Severe congestion · 92% predicted in 18 min. Reroute via Kalindi Kunj.", 40800, 1),
    ("medium", "Ring Road North · ISBT", "Slow-moving traffic from protest near Civil Lines.", 18600, 1),
    ("low", "MG Road · Saket", "Sensor variance corrected — flows back to baseline.", 4200, 0),
    ("high", "Noida Expressway · Sec-38", "Stalled truck right shoulder · clearance ~12 min.", 9500, 1),
    ("medium", "MG Road · Connaught", "Predicted morning peak surpassed target by 8%.", 23400, 0),
    ("critical", "DND Flyway", "Accident cleared after 24 min · advisory ended.", 40800, 0),
]


def seed() -> None:
    print(f"Connecting to database…")
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            print("Clearing existing data…")
            cur.execute(
                "truncate traffic_readings, predictions, alerts, routes, "
                "road_segments restart identity cascade"
            )

            print(f"Inserting {len(SEGMENTS)} road segments…")
            seg_ids: list[int] = []
            for seg in SEGMENTS:
                s_lat, s_lng, e_lat, e_lng = segment_endpoints(seg["geometry"])
                cur.execute(
                    """
                    insert into road_segments
                      (name, code, segment_type, length_km, lanes, speed_limit_kmh,
                       start_lat, start_lng, end_lat, end_lng, geometry)
                    values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    returning id
                    """,
                    (
                        seg["name"], seg["code"], seg["segment_type"],
                        seg["length_km"], seg["lanes"], seg["speed_limit_kmh"],
                        s_lat, s_lng, e_lat, e_lng, json.dumps(seg["geometry"]),
                    ),
                )
                seg_ids.append(cur.fetchone()[0])

            now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
            # round down to interval boundary
            now -= timedelta(minutes=now.minute % INTERVAL_MIN)
            start = now - timedelta(days=DAYS)

            print(f"Generating {DAYS} days of readings ({INTERVAL_MIN}-min interval)…")
            total = 0
            for seg_id, seg in zip(seg_ids, SEGMENTS):
                rows = build_readings(seg_id, seg, start)
                with cur.copy(
                    "copy traffic_readings "
                    "(segment_id, ts, avg_speed_kmh, vehicle_count, occupancy_pct, "
                    " congestion_label, rain_flag, fog_flag, event_nearby, accident_nearby) "
                    "from stdin"
                ) as copy:
                    for row in rows:
                        copy.write_row(row)
                total += len(rows)
            print(f"  → {total} traffic readings inserted.")

            print(f"Inserting {len(STARTER_ALERTS)} starter alerts…")
            for offset, (sev, road, msg, sent, active) in enumerate(STARTER_ALERTS):
                cur.execute(
                    """
                    insert into alerts (severity, road_name, message, sent_count, is_active, created_at)
                    values (%s,%s,%s,%s,%s, now() - (%s || ' minutes')::interval)
                    """,
                    (sev, road, msg, sent, bool(active), offset * 7 + 1),
                )

        conn.commit()
    print("Seed complete.")


if __name__ == "__main__":
    seed()
