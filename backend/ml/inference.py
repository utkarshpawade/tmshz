"""
Load the trained XGBoost model and run congestion predictions.

`predict(features)` takes a feature dict (from
`feature_pipeline.assemble_live_features`) and returns the prediction payload
consumed by the /api/predict endpoint.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from config import settings
from ml.feature_pipeline import (
    CODE_TO_LABEL,
    FEATURE_COLUMNS,
    FORECAST_MINUTES,
    LABELS,
    RISK_WEIGHTS,
)


class ModelNotTrainedError(RuntimeError):
    """Raised when the model artifacts are missing — run `python -m ml.train`."""


@lru_cache(maxsize=1)
def _load() -> tuple[Any, dict]:
    import joblib

    model_dir = Path(settings.model_dir)
    model_path = model_dir / "xgb_model.joblib"
    prep_path = model_dir / "preprocessor.joblib"
    if not model_path.exists() or not prep_path.exists():
        raise ModelNotTrainedError(
            f"Model artifacts not found in {model_dir.resolve()}. "
            "Run `python -m ml.train` (or start with TRAIN_ON_STARTUP=true)."
        )
    return joblib.load(model_path), joblib.load(prep_path)


def model_ready() -> bool:
    try:
        _load()
        return True
    except Exception:
        return False


def model_metrics() -> dict:
    try:
        _, prep = _load()
        return prep.get("metrics", {})
    except Exception:
        return {}


def predict(features: dict[str, float]) -> dict[str, Any]:
    """
    Run the classifier on one feature dict.

    Returns: congestion_label, confidence, probabilities, risk_score,
    forecast_minutes.
    """
    model, prep = _load()
    columns = prep["feature_columns"]
    row = pd.DataFrame([[features[c] for c in columns]], columns=columns)

    proba = model.predict_proba(row)[0]
    probabilities = {LABELS[i]: round(float(proba[i]), 4) for i in range(len(LABELS))}

    top = int(np.argmax(proba))
    risk_score = float(np.dot(proba, RISK_WEIGHTS))

    return {
        "congestion_label": CODE_TO_LABEL[top],
        "confidence": round(float(proba[top]), 4),
        "probabilities": probabilities,
        "risk_score": round(risk_score, 1),
        "forecast_minutes": FORECAST_MINUTES,
    }


def reset_cache() -> None:
    """Drop the cached model — used after a retrain."""
    _load.cache_clear()
