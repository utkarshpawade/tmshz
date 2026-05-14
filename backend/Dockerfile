FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /backend

# System deps kept minimal; psycopg[binary] ships its own libpq.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 8000

# Honors $PORT when the host injects one (Render), else 8000 for local runs.
HEALTHCHECK --interval=15s --timeout=4s --start-period=25s --retries=4 \
    CMD curl -fs "http://localhost:${PORT:-8000}/api/health" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
