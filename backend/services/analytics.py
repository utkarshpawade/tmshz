"""Analytics service -- exposes the 7k-dataset model and aggregations."""
from __future__ import annotations

import json
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from config import settings

DATASET_PATH = Path(__file__).resolve().parent.parent / "TrafficCongestion_MultiLocation_7000Rows.xlsx"
ARTIFACT_DIR = Path(settings.model_dir)

_LABELS = ["Low", "Medium", "High", "Very High"]
_LABEL_CODES = {l: i for i, l in enumerate(_LABELS)}
_WEATHER = ["Clear", "Cloudy", "Rain", "Heavy Rain", "Fog"]


@lru_cache(maxsize=1)
def _load_artifacts() -> tuple[Any, dict] | None:
    model_path = ARTIFACT_DIR / "dataset_model.joblib"
    prep_path = ARTIFACT_DIR / "dataset_preprocessor.joblib"
    if not model_path.exists() or not prep_path.exists():
        return None
    return joblib.load(model_path), joblib.load(prep_path)


_METRICS_CACHE: tuple[float, dict] | None = None

def _load_metrics() -> dict:
    """Re-read the metrics JSON whenever the file mtime changes, so editing
    dataset_metrics.json takes effect on the next request without a uvicorn
    restart. (Previously this was @lru_cache'd and pinned to the first read.)"""
    global _METRICS_CACHE
    p = ARTIFACT_DIR / "dataset_metrics.json"
    if not p.exists():
        return {}
    try:
        mtime = p.stat().st_mtime
        if _METRICS_CACHE and _METRICS_CACHE[0] == mtime:
            return _METRICS_CACHE[1]
        data = json.loads(p.read_text())
        _METRICS_CACHE = (mtime, data)
        return data
    except Exception:
        return {}


@lru_cache(maxsize=1)
def _load_df() -> pd.DataFrame | None:
    if not DATASET_PATH.exists():
        return None
    df = pd.read_excel(DATASET_PATH)
    df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")
    df = df.dropna(subset=["Timestamp", "Congestion Level"])
    df["hour"] = df["Timestamp"].dt.hour
    df["day_of_week"] = df["Timestamp"].dt.dayofweek
    return df


def model_ready() -> bool:
    return _load_artifacts() is not None


def overview() -> dict[str, Any]:
    """Headline analytics numbers + class distribution + feature importances."""
    metrics = _load_metrics()
    df = _load_df()
    out: dict[str, Any] = {
        "model_ready": model_ready(),
        "accuracy": metrics.get("accuracy"),
        "macro_f1": metrics.get("macro_f1"),
        "n_samples": metrics.get("n_samples"),
        "n_features": metrics.get("n_features"),
        "n_locations": metrics.get("n_locations"),
        "labels": metrics.get("labels", _LABELS),
        "class_distribution": metrics.get("class_distribution", {}),
        "feature_importances": metrics.get("feature_importances", [])[:12],
        "confusion_matrix": metrics.get("confusion_matrix"),
        "trained_at": metrics.get("trained_at"),
    }

    if df is not None:
        out["avg_speed_kmh"]    = float(df["Avg Speed (km/h)"].mean())
        out["avg_traffic_vol"]  = float(df["Traffic Volume"].mean())
        out["accident_rate"]    = float((df["Accident"] == "Yes").mean())
        out["event_rate"]       = float((df["Event"] == "Yes").mean())
        out["pct_severe"]       = float((df["Congestion Level"] == "Very High").mean())
        out["weather_breakdown"] = (
            df["Weather"].value_counts(normalize=True).round(4).to_dict()
        )
    return out


def by_location() -> list[dict[str, Any]]:
    df = _load_df()
    if df is None:
        return []
    grp = df.groupby("Location").agg(
        avg_speed=("Avg Speed (km/h)", "mean"),
        avg_volume=("Traffic Volume", "mean"),
        accident_rate=("Accident", lambda s: (s == "Yes").mean()),
        severe_rate=("Congestion Level", lambda s: (s == "Very High").mean()),
        rows=("Congestion Level", "count"),
        lat=("Latitude", "mean"),
        lng=("Longitude", "mean"),
    ).reset_index().sort_values("severe_rate", ascending=False)
    return [
        {
            "location": r["Location"],
            "avg_speed_kmh": round(float(r["avg_speed"]), 1),
            "avg_volume": round(float(r["avg_volume"]), 1),
            "accident_rate": round(float(r["accident_rate"]), 3),
            "severe_rate": round(float(r["severe_rate"]), 3),
            "rows": int(r["rows"]),
            "lat": float(r["lat"]),
            "lng": float(r["lng"]),
        }
        for _, r in grp.iterrows()
    ]


def hourly_profile() -> list[dict[str, Any]]:
    """Average traffic volume + speed + severe rate per hour-of-day."""
    df = _load_df()
    if df is None:
        return []
    grp = df.groupby("hour").agg(
        volume=("Traffic Volume", "mean"),
        speed=("Avg Speed (km/h)", "mean"),
        severe_rate=("Congestion Level", lambda s: (s == "Very High").mean()),
    ).reset_index().sort_values("hour")
    return [
        {
            "hour": int(r["hour"]),
            "volume": round(float(r["volume"]), 1),
            "speed": round(float(r["speed"]), 1),
            "severe_rate": round(float(r["severe_rate"]), 3),
        }
        for _, r in grp.iterrows()
    ]


def weather_impact() -> list[dict[str, Any]]:
    df = _load_df()
    if df is None:
        return []
    grp = df.groupby("Weather").agg(
        avg_speed=("Avg Speed (km/h)", "mean"),
        severe_rate=("Congestion Level", lambda s: (s == "Very High").mean()),
        rows=("Congestion Level", "count"),
    ).reset_index().sort_values("severe_rate", ascending=False)
    return [
        {
            "weather": r["Weather"],
            "avg_speed_kmh": round(float(r["avg_speed"]), 1),
            "severe_rate": round(float(r["severe_rate"]), 3),
            "rows": int(r["rows"]),
        }
        for _, r in grp.iterrows()
    ]


def predict_single(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Make a single prediction using the 7k-dataset model.

    Expected payload keys (defaults used for missing):
      location, hour (0-23), day_of_week (0-6),
      traffic_volume, avg_speed_kmh, weather, rain_mm,
      accident (bool), event (bool), pt_density (0-100),
      lat, lng
    """
    art = _load_artifacts()
    if art is None:
        raise RuntimeError("Model not trained yet. Run: python -m ml.dataset_train")
    model, prep = art
    cols: list[str] = prep["feature_columns"]
    labels: list[str] = prep["labels"]

    # Build a one-row frame matching feature columns
    row: dict[str, float] = {c: 0.0 for c in cols}
    hour = int(payload.get("hour", 9))
    dow = int(payload.get("day_of_week", 1))
    row["hour"] = hour
    row["day_of_week"] = dow
    row["is_weekend"] = 1.0 if dow >= 5 else 0.0
    row["is_rush_hour"] = 1.0 if (7 <= hour <= 10) or (17 <= hour <= 20) else 0.0
    row["Traffic Volume"] = float(payload.get("traffic_volume", 400))
    row["Avg Speed (km/h)"] = float(payload.get("avg_speed_kmh", 35))
    row["Rain(mm)"] = float(payload.get("rain_mm", 0))
    row["Public Transport Density"] = float(payload.get("pt_density", 50))
    row["accident_flag"] = 1.0 if payload.get("accident") else 0.0
    row["event_flag"] = 1.0 if payload.get("event") else 0.0
    row["Latitude"] = float(payload.get("lat", 28.6139))
    row["Longitude"] = float(payload.get("lng", 77.2090))

    w = str(payload.get("weather", "Clear"))
    key = f"w_{w.replace(' ', '_').lower()}"
    if key in row:
        row[key] = 1.0

    loc = str(payload.get("location", "")).strip()
    loc_key = f"loc_{loc}"
    if loc_key in row:
        row[loc_key] = 1.0
    elif "loc_Other" in row:
        row["loc_Other"] = 1.0

    df = pd.DataFrame([[row[c] for c in cols]], columns=cols)
    proba = model.predict_proba(df)[0]
    top = int(np.argmax(proba))
    probabilities = {labels[i]: round(float(proba[i]), 4) for i in range(len(labels))}
    risk_weights = np.array([10.0, 40.0, 70.0, 95.0])  # Low / Medium / High / Very High
    risk_score = float(np.dot(proba, risk_weights))

    return {
        "predicted_label": labels[top],
        "confidence": round(float(proba[top]), 4),
        "probabilities": probabilities,
        "risk_score": round(risk_score, 1),
        "inputs": payload,
    }
