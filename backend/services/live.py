"""
Live-update simulation for the WebSocket feed.

Maintains an in-memory occupancy state seeded from the latest DB readings,
then nudges it with a small random walk on every tick so the dashboard map
shows live congestion deltas without writing back to the database.
"""
from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any

from services import repo

# segment_id -> current simulated occupancy %
_sim_state: dict[int, float] = {}
_seg_meta: dict[int, dict[str, Any]] = {}


def _label(occ: float) -> str:
    if occ >= 85:
        return "Critical"
    if occ >= 65:
        return "High"
    if occ >= 40:
        return "Medium"
    return "Low"


def _ensure_seeded() -> None:
    if _sim_state:
        return
    latest = repo.get_latest_readings_all()
    for seg in repo.get_all_segments():
        _seg_meta[seg["id"]] = seg
        lr = latest.get(seg["id"])
        _sim_state[seg["id"]] = float(lr["occupancy_pct"]) if lr else 45.0


def build_live_tick() -> dict[str, Any]:
    """Advance the simulation one step and return the broadcast payload."""
    _ensure_seeded()
    updates: list[dict[str, Any]] = []

    for sid, occ in list(_sim_state.items()):
        delta = random.uniform(-6.0, 6.0)
        # gentle pull toward a mid baseline so it never runs away
        delta += (52.0 - occ) * 0.04
        new_occ = max(4.0, min(97.0, occ + delta))
        _sim_state[sid] = new_occ

        seg = _seg_meta.get(sid, {})
        speed_limit = seg.get("speed_limit_kmh", 60)
        speed = max(8.0, speed_limit * (1.0 - 0.82 * new_occ / 100.0))

        updates.append({
            "segment_id": sid,
            "name": seg.get("name", f"Segment {sid}"),
            "occupancy_pct": round(new_occ, 1),
            "avg_speed_kmh": round(speed, 1),
            "congestion_label": _label(new_occ),
            "delta": round(new_occ - occ, 1),
        })

    city_occ = sum(_sim_state.values()) / len(_sim_state) if _sim_state else 0
    return {
        "type": "congestion_update",
        "ts": datetime.now(timezone.utc).isoformat(),
        "city_risk_score": round(city_occ, 1),
        "segments": updates,
    }


def trigger_friday_rush() -> None:
    """Demo hook (used in Phase 6): spike MG Road + nearby corridors."""
    _ensure_seeded()
    for sid, seg in _seg_meta.items():
        name = seg.get("name", "").lower()
        if "mg road" in name or "nh-48" in name or "iffco" in name:
            _sim_state[sid] = min(97.0, _sim_state[sid] + 35.0)
