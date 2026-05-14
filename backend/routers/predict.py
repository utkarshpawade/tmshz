"""POST /api/predict — run the XGBoost congestion forecast for a segment."""
from fastapi import APIRouter, HTTPException

from ml.inference import ModelNotTrainedError
from models.schemas import PredictRequest, PredictResponse
from services import predictions

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> dict:
    overrides = {
        "rain_flag": req.rain_flag,
        "fog_flag": req.fog_flag,
        "event_nearby": req.event_nearby,
        "accident_nearby": req.accident_nearby,
    }
    overrides = {k: v for k, v in overrides.items() if v is not None}
    try:
        # store=False keeps /predict well under 200 ms: it drops one Mumbai
        # round-trip. The predictions table is best-effort logging, not the
        # source of truth for any feature.
        return predictions.predict_for_segment(
            req.segment_id, overrides=overrides or None, at=req.at, store=False
        )
    except ModelNotTrainedError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
