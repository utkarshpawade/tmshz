"""Application configuration -- loads from environment / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Local dev: .env lives at the repo root; Docker injects vars directly.
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    # Supabase Postgres connection string.
    database_url: str = "postgresql://postgres:postgres@localhost:5432/postgres"

    # Supabase project metadata (informational / optional client use)
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # API
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ML model artifacts
    model_dir: str = "ml/artifacts"

    # WebSocket live-update interval (seconds)
    live_update_interval: int = 30

    # LLM (Groq) -- optional. If missing, /api/chat falls back to the
    # rule-based bot so the demo still works.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def has_groq(self) -> bool:
        return bool(self.groq_api_key and not self.groq_api_key.startswith("<"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
