"""Health + diagnostics router."""
from fastapi import APIRouter

from db.database import healthcheck, query_one

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Liveness + DB connectivity + seeded-row counts."""
    db_ok = healthcheck()
    counts: dict[str, int] = {}
    if db_ok:
        for table in ("road_segments", "traffic_readings", "predictions", "alerts", "routes"):
            try:
                row = query_one(f"select count(*)::int as n from {table}")
                counts[table] = row["n"] if row else 0
            except Exception:
                counts[table] = -1
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "tables": counts,
    }
