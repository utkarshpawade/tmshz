"""Postgres connection pool + tiny query helpers (psycopg 3)."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from config import settings

_pool: ConnectionPool | None = None


def init_pool() -> ConnectionPool:
    """Create the global connection pool (called on app startup)."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
            open=True,
        )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def get_pool() -> ConnectionPool:
    if _pool is None:
        return init_pool()
    return _pool


@contextmanager
def get_conn():
    """Context-managed connection from the pool."""
    pool = get_pool()
    with pool.connection() as conn:
        yield conn


def query_all(sql: str, params: tuple | dict | None = None) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def query_one(sql: str, params: tuple | dict | None = None) -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()


def execute(sql: str, params: tuple | dict | None = None) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()


def healthcheck() -> bool:
    """Return True if the database is reachable."""
    try:
        row = query_one("select 1 as ok")
        return bool(row and row.get("ok") == 1)
    except Exception:
        return False
