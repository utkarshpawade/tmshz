"""
Train the congestion classifier on the user-supplied 7000-row Excel dataset
(TrafficCongestion_MultiLocation_7000Rows.xlsx).

Dataset schema:
  Timestamp, Location, Latitude, Longitude, Traffic Volume,
  Avg Speed (km/h), Weather, Rain(mm), Accident, Event,
  Public Transport Density, Congestion Level

Target: Congestion Level in {Low, Medium, High, Very High}.

Run from backend/:  python -m ml.dataset_train
Writes: ml/artifacts/dataset_model.joblib
        ml/artifacts/dataset_preprocessor.joblib
        ml/artifacts/dataset_metrics.json
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, f1_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from config import settings


DATASET_PATH = Path(__file__).resolve().parent.parent / "TrafficCongestion_MultiLocation_7000Rows.xlsx"

LABELS = ["Low", "Medium", "High", "Very High"]
LABEL_TO_CODE = {l: i for i, l in enumerate(LABELS)}
CODE_TO_LABEL = {i: l for l, i in LABEL_TO_CODE.items()}

WEATHER = ["Clear", "Cloudy", "Rain", "Heavy Rain", "Fog"]


def load_df(path: Path = DATASET_PATH) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    df = pd.read_excel(path)
    df["Timestamp"] = pd.to_datetime(df["Timestamp"], errors="coerce")
    df = df.dropna(subset=["Timestamp", "Congestion Level"])
    return df


def engineer(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    df = df.copy()
    df["hour"] = df["Timestamp"].dt.hour
    df["day_of_week"] = df["Timestamp"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_rush_hour"] = df["hour"].between(7, 10).astype(int) | df["hour"].between(17, 20).astype(int)
    df["accident_flag"] = (df["Accident"] == "Yes").astype(int)
    df["event_flag"] = (df["Event"] == "Yes").astype(int)

    # Weather one-hot
    for w in WEATHER:
        df[f"w_{w.replace(' ', '_').lower()}"] = (df["Weather"] == w).astype(int)

    # Location one-hot (top locations only; others -> other)
    top_locs = df["Location"].value_counts().head(20).index.tolist()
    df["Location_norm"] = df["Location"].where(df["Location"].isin(top_locs), other="Other")
    loc_dummies = pd.get_dummies(df["Location_norm"], prefix="loc")
    loc_cols = list(loc_dummies.columns)
    df = pd.concat([df, loc_dummies], axis=1)

    numeric = [
        "hour", "day_of_week", "is_weekend", "is_rush_hour",
        "Traffic Volume", "Avg Speed (km/h)", "Rain(mm)",
        "Public Transport Density",
        "accident_flag", "event_flag", "Latitude", "Longitude",
    ] + [f"w_{w.replace(' ', '_').lower()}" for w in WEATHER] + loc_cols

    X = df[numeric].astype(float)
    y = df["Congestion Level"].map(LABEL_TO_CODE).astype(int)
    return X, y, numeric


def main() -> None:
    print(f"Loading dataset from {DATASET_PATH}")
    df = load_df()
    print(f"  {len(df)} rows across {df['Location'].nunique()} locations")

    X, y, feature_columns = engineer(df)
    print(f"Feature matrix: {X.shape}, features: {len(feature_columns)}")
    print("Class balance:", {CODE_TO_LABEL[c]: int(n) for c, n in y.value_counts().sort_index().items()})

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    counts = np.bincount(y_train, minlength=len(LABELS))
    inv = counts.sum() / np.maximum(counts, 1)
    sample_weight = inv[y_train.to_numpy()]

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=len(LABELS),
        n_estimators=400,
        max_depth=6,
        learning_rate=0.07,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=2,
        reg_lambda=1.2,
        eval_metric="mlogloss",
        n_jobs=4,
        random_state=42,
    )
    print("Training XGBoost...")
    model.fit(X_train, y_train, sample_weight=sample_weight)

    pred = model.predict(X_test)
    proba = model.predict_proba(X_test)
    acc = accuracy_score(y_test, pred)
    f1 = f1_score(y_test, pred, average="macro")
    report = classification_report(y_test, pred, target_names=LABELS, zero_division=0, output_dict=True)
    cm = confusion_matrix(y_test, pred).tolist()

    print(f"\n=== Held-out 20% ===")
    print(f"Accuracy : {acc:.4f}")
    print(f"Macro-F1 : {f1:.4f}\n")
    print(classification_report(y_test, pred, target_names=LABELS, zero_division=0))

    importances = sorted(
        zip(feature_columns, model.feature_importances_),
        key=lambda kv: kv[1], reverse=True,
    )
    print("Top 10 features:")
    for name, score in importances[:10]:
        print(f"  {name:<28} {score:.4f}")

    model_dir = Path(settings.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_dir / "dataset_model.joblib")
    joblib.dump(
        {
            "feature_columns": feature_columns,
            "labels": LABELS,
            "weather": WEATHER,
        },
        model_dir / "dataset_preprocessor.joblib",
    )

    metrics = {
        "accuracy": float(acc),
        "macro_f1": float(f1),
        "labels": LABELS,
        "confusion_matrix": cm,
        "report": report,
        "feature_importances": [
            {"name": n, "score": float(s)} for n, s in importances
        ],
        "class_distribution": {
            CODE_TO_LABEL[c]: int(n) for c, n in y.value_counts().sort_index().items()
        },
        "n_samples": int(len(df)),
        "n_features": len(feature_columns),
        "n_locations": int(df["Location"].nunique()),
        "trained_at": pd.Timestamp.utcnow().isoformat(),
    }
    (model_dir / "dataset_metrics.json").write_text(json.dumps(metrics, indent=2))

    print(f"\nSaved artifacts to {model_dir.resolve()}")
    print("  - dataset_model.joblib")
    print("  - dataset_preprocessor.joblib")
    print("  - dataset_metrics.json")


if __name__ == "__main__":
    main()
