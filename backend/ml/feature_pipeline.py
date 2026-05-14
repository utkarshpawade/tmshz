"""
Feature engineering for the congestion predictor.

The model predicts the congestion label 45 minutes ahead (3 readings at the
15-minute seed interval). Features combine time context, weather/incident
flags, current sensor state, short lags, rolling stats, and static segment
attributes.

Used both for offline training (`build_training_frame`) and live inference
(`assemble_live_features`).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd

# ---- constants -------------------------------------------------------------
LABELS = ["Low", "Medium", "High", "Critical"]
LABEL_TO_CODE = {label: i for i, label in enumerate(LABELS)}
CODE_TO_LABEL = {i: label for label, i in LABEL_TO_CODE.items()}

FORECAST_STEPS = 3        # 3 x 15 min
FORECAST_MINUTES = 45
ROLL_WINDOW = 4           # last hour
SEGMENT_TYPES = ["highway", "arterial", "corridor", "junction"]
RUSH_HOURS = {7, 8, 9, 10, 17, 18, 19, 20}

# Risk-score weights per class — expected value maps probabilities to 0-100.
RISK_WEIGHTS = np.array([8.0, 38.0, 68.0, 92.0])

FEATURE_COLUMNS = [
    "hour", "day_of_week", "is_weekend", "is_rush_hour",
    "rain_flag", "fog_flag", "event_nearby", "accident_nearby",
    "occupancy_pct", "avg_speed_kmh", "vehicle_count",
    "occ_lag_1", "occ_lag_2", "occ_lag_3", "speed_lag_1",
    "speed_roll_mean", "speed_roll_std", "occ_roll_mean",
    "lanes", "speed_limit_kmh",
    "is_highway", "is_arterial", "is_corridor", "is_junction",
]


def _is_rush_hour(hour: int, day_of_week: int) -> int:
    return int(day_of_week < 5 and hour in RUSH_HOURS)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add time, lag, rolling, and segment one-hot features.

    Expects columns: segment_id, ts, avg_speed_kmh, vehicle_count,
    occupancy_pct, congestion_label, rain_flag, fog_flag, event_nearby,
    accident_nearby, segment_type, lanes, speed_limit_kmh.
    """
    df = df.copy()
    df["ts"] = pd.to_datetime(df["ts"], utc=True)
    df = df.sort_values(["segment_id", "ts"]).reset_index(drop=True)

    # time context
    df["hour"] = df["ts"].dt.hour
    df["day_of_week"] = df["ts"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_rush_hour"] = [
        _is_rush_hour(h, d) for h, d in zip(df["hour"], df["day_of_week"])
    ]

    # boolean flags -> int
    for col in ("rain_flag", "fog_flag", "event_nearby", "accident_nearby"):
        df[col] = df[col].astype(int)

    grp = df.groupby("segment_id", group_keys=False)

    # short lags
    df["occ_lag_1"] = grp["occupancy_pct"].shift(1)
    df["occ_lag_2"] = grp["occupancy_pct"].shift(2)
    df["occ_lag_3"] = grp["occupancy_pct"].shift(3)
    df["speed_lag_1"] = grp["avg_speed_kmh"].shift(1)

    # rolling stats over the last hour (inclusive of current reading)
    df["speed_roll_mean"] = grp["avg_speed_kmh"].transform(
        lambda s: s.rolling(ROLL_WINDOW, min_periods=ROLL_WINDOW).mean()
    )
    df["speed_roll_std"] = grp["avg_speed_kmh"].transform(
        lambda s: s.rolling(ROLL_WINDOW, min_periods=ROLL_WINDOW).std()
    )
    df["occ_roll_mean"] = grp["occupancy_pct"].transform(
        lambda s: s.rolling(ROLL_WINDOW, min_periods=ROLL_WINDOW).mean()
    )

    # segment-type one-hot
    for st in SEGMENT_TYPES:
        df[f"is_{st}"] = (df["segment_type"] == st).astype(int)

    return df


def build_training_frame(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return (X, y): engineered features and the 45-min-ahead label code."""
    df = engineer_features(df)

    # target: congestion label FORECAST_STEPS readings into the future
    df["target_label"] = df.groupby("segment_id", group_keys=False)[
        "congestion_label"
    ].shift(-FORECAST_STEPS)
    df["target"] = df["target_label"].map(LABEL_TO_CODE)

    df = df.dropna(subset=FEATURE_COLUMNS + ["target"]).reset_index(drop=True)

    X = df[FEATURE_COLUMNS].astype(float)
    y = df["target"].astype(int)
    return X, y


def assemble_live_features(
    recent_rows: list[dict[str, Any]],
    segment_meta: dict[str, Any],
    overrides: dict[str, Any] | None = None,
    at: datetime | None = None,
) -> dict[str, float]:
    """
    Build a single feature dict for live inference.

    `recent_rows` — at least ROLL_WINDOW readings for one segment, ordered
    oldest -> newest. `segment_meta` — {segment_type, lanes, speed_limit_kmh}.
    `overrides` — optional {rain_flag, fog_flag, event_nearby, accident_nearby}.
    `at` — timestamp the prediction is anchored to (defaults to latest row ts).
    """
    if len(recent_rows) < ROLL_WINDOW:
        raise ValueError(
            f"need at least {ROLL_WINDOW} recent readings, got {len(recent_rows)}"
        )

    rows = sorted(recent_rows, key=lambda r: r["ts"])
    window = rows[-ROLL_WINDOW:]
    current = rows[-1]
    overrides = overrides or {}

    ts = at or pd.to_datetime(current["ts"], utc=True)
    ts = pd.to_datetime(ts, utc=True)
    hour = int(ts.hour)
    dow = int(ts.dayofweek)

    speeds = [float(r["avg_speed_kmh"]) for r in window]
    occs = [float(r["occupancy_pct"]) for r in window]

    def flag(name: str) -> int:
        if name in overrides and overrides[name] is not None:
            return int(bool(overrides[name]))
        return int(bool(current.get(name, False)))

    feats = {
        "hour": hour,
        "day_of_week": dow,
        "is_weekend": int(dow >= 5),
        "is_rush_hour": _is_rush_hour(hour, dow),
        "rain_flag": flag("rain_flag"),
        "fog_flag": flag("fog_flag"),
        "event_nearby": flag("event_nearby"),
        "accident_nearby": flag("accident_nearby"),
        "occupancy_pct": float(current["occupancy_pct"]),
        "avg_speed_kmh": float(current["avg_speed_kmh"]),
        "vehicle_count": float(current["vehicle_count"]),
        "occ_lag_1": float(rows[-2]["occupancy_pct"]),
        "occ_lag_2": float(rows[-3]["occupancy_pct"]),
        "occ_lag_3": float(rows[-4]["occupancy_pct"]),
        "speed_lag_1": float(rows[-2]["avg_speed_kmh"]),
        "speed_roll_mean": float(np.mean(speeds)),
        "speed_roll_std": float(np.std(speeds, ddof=1)),
        "occ_roll_mean": float(np.mean(occs)),
        "lanes": float(segment_meta["lanes"]),
        "speed_limit_kmh": float(segment_meta["speed_limit_kmh"]),
    }
    for st in SEGMENT_TYPES:
        feats[f"is_{st}"] = int(segment_meta["segment_type"] == st)

    return {col: float(feats[col]) for col in FEATURE_COLUMNS}
