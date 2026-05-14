"""
Train the XGBoost congestion classifier on the seeded traffic readings.

Predicts the congestion label (Low / Medium / High / Critical) 45 minutes
ahead. Saves the model + a preprocessor bundle to MODEL_DIR.

Run from backend/:  python -m ml.train
"""
from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import psycopg
from psycopg.rows import dict_row
from sklearn.metrics import accuracy_score, classification_report, f1_score
from xgboost import XGBClassifier

from config import settings
from ml.feature_pipeline import (
    CODE_TO_LABEL,
    FEATURE_COLUMNS,
    LABELS,
    build_training_frame,
)

TRAIN_QUERY = """
    select r.segment_id, r.ts, r.avg_speed_kmh, r.vehicle_count, r.occupancy_pct,
           r.congestion_label, r.rain_flag, r.fog_flag, r.event_nearby,
           r.accident_nearby,
           s.segment_type, s.lanes, s.speed_limit_kmh
    from traffic_readings r
    join road_segments s on s.id = r.segment_id
    order by r.segment_id, r.ts
"""


def load_readings() -> pd.DataFrame:
    print("Loading traffic readings from the database...")
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        rows = conn.execute(TRAIN_QUERY).fetchall()
    df = pd.DataFrame(rows)
    print(f"  -> {len(df)} readings across {df['segment_id'].nunique()} segments")
    return df


def main() -> None:
    df = load_readings()
    X, y = build_training_frame(df)
    print(f"Training frame: {len(X)} samples, {len(FEATURE_COLUMNS)} features")
    print("Class balance:", {CODE_TO_LABEL[c]: int(n) for c, n in y.value_counts().items()})

    # time-ordered split -- last 20% is the test set (honest forward eval)
    split = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    # class weights to counter imbalance (Low dominates)
    counts = np.bincount(y_train, minlength=len(LABELS))
    inv = counts.sum() / np.maximum(counts, 1)
    sample_weight = inv[y_train.to_numpy()]

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=len(LABELS),
        n_estimators=350,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=2,
        reg_lambda=1.2,
        eval_metric="mlogloss",
        n_jobs=4,
        random_state=42,
    )
    print("Training XGBoost classifier...")
    model.fit(X_train, y_train, sample_weight=sample_weight)

    # evaluation
    pred = model.predict(X_test)
    acc = accuracy_score(y_test, pred)
    f1 = f1_score(y_test, pred, average="macro")
    print(f"\n=== Evaluation (held-out 20%) ===")
    print(f"Accuracy : {acc:.4f}")
    print(f"Macro-F1 : {f1:.4f}\n")
    print(classification_report(y_test, pred, target_names=LABELS, zero_division=0))

    # feature importances (top 8)
    importances = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_),
        key=lambda kv: kv[1], reverse=True,
    )
    print("Top features:")
    for name, score in importances[:8]:
        print(f"  {name:<18} {score:.4f}")

    # persist artifacts
    model_dir = Path(settings.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_dir / "xgb_model.joblib")
    joblib.dump(
        {
            "feature_columns": FEATURE_COLUMNS,
            "labels": LABELS,
            "metrics": {"accuracy": float(acc), "macro_f1": float(f1)},
        },
        model_dir / "preprocessor.joblib",
    )
    print(f"\nSaved model + preprocessor to {model_dir.resolve()}")


if __name__ == "__main__":
    main()
