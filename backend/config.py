"""Application configuration — loads from environment / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Local dev: .env lives at the repo root; Docker injects vars directly.
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # Supabase Postgres connection string.
    # Transaction pooler (port 6543) recommended for FastAPI:
    #   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"

    # Supabase project metadata (informational / optional client use)
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # API
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000"

    # ML model artifacts
    model_dir: str = "ml/artifacts"

    # WebSocket live-update interval (seconds)
    live_update_interval: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
