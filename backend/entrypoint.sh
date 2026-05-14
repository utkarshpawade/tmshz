#!/usr/bin/env bash
# Backend container entrypoint.
#  - Waits for the database to be reachable.
#  - Optionally (re)seeds 7 days of synthetic data when SEED_ON_STARTUP=true.
#  - Phase 2+ : trains the ML model when TRAIN_ON_STARTUP=true.
#  - Launches the FastAPI server.
set -e

echo "[entrypoint] Waiting for database…"
python - <<'PY'
import time, sys
from config import settings
import psycopg
for attempt in range(30):
    try:
        with psycopg.connect(settings.database_url, connect_timeout=3) as c:
            c.execute("select 1")
        print("[entrypoint] Database is reachable.")
        sys.exit(0)
    except Exception as e:
        print(f"[entrypoint] db not ready ({attempt+1}/30): {e}")
        time.sleep(2)
print("[entrypoint] ERROR: database unreachable after 60s")
sys.exit(1)
PY

if [ "${SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "[entrypoint] Seeding synthetic data…"
  python -m db.seed
fi

if [ "${TRAIN_ON_STARTUP:-false}" = "true" ]; then
  if [ -f ml/train.py ]; then
    echo "[entrypoint] Training ML model…"
    python -m ml.train
  fi
fi

echo "[entrypoint] Starting FastAPI on :8000"
exec uvicorn main:app --host 0.0.0.0 --port 8000
