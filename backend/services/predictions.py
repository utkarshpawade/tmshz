"""Prediction service — assembles live features and runs the XGBoost model."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from db.database import execute
from ml.feature_pipeline import ROLL_WINDOW, assemble_live_features
from ml.inference import predict as model_predict
from services import repo


def predict_for_segment(
    segment_id: int,
    overrides: dict[str, Any] | None = None,
    at: datetime | None = None,
    store: bool = True,
) -> dict[str, Any]:
    """Run the 45-min-ahead congestion forecast for a single segment."""
    seg = repo.get_segment(segment_id)
    if not seg:
        raise ValueError(f"segment {segment_id} not found")

    rows = repo.get_recent_readings(segment_id, limit=ROLL_WINDOW + 2)
    if len(rows) < ROLL_WINDOW:
        raise ValueError(f"not enough readings for segment {segment_id}")

    feats = assemble_live_features(rows, seg, overrides=overrides, at=at)
    result = model_predict(feats)
    result["segment_id"] = segment_id
    result["segment_name"] = seg["name"]

    if store:
        _store(segment_id, result, at or rows[-1]["ts"])
    return result


def _store(segment_id: int, result: dict, anchor_ts) -> None:
    """Best-effort persistence to the predictions table."""
    try:
        forecast_for = anchor_ts + timedelta(minutes=result["forecast_minutes"])
        p = result["probabilities"]
        execute(
            """
            insert into predictions
              (segment_id, forecast_for, forecast_minutes, congestion_label,
               confidence, prob_low, prob_medium, prob_high, prob_critical, risk_score)
            values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                segment_id, forecast_for, result["forecast_minutes"],
                result["congestion_label"], result["confidence"],
                p["Low"], p["Medium"], p["High"], p["Critical"], result["risk_score"],
            ),
        )
    except Exception:
        pass  # prediction logging is non-critical


def predict_all_segments(store: bool = False) -> list[dict[str, Any]]:
    """Forecast every segment — used by the heatmap and city risk score."""
    out: list[dict[str, Any]] = []
    for seg in repo.get_all_segments():
        try:
            out.append(predict_for_segment(seg["id"], store=store))
        except Exception:
            continue
    return out
