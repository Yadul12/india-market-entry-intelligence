from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "India Market Entry & Strategic Growth Intelligence"
    app_version: str = "1.0.0"
    database_url: str = "sqlite:///./data/india_market_entry.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    api_prefix: str = "/api"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql")

    def ensure_sqlite_dir(self) -> None:
        if self.database_url.startswith("sqlite:///"):
            rel_path = self.database_url.replace("sqlite:///", "", 1)
            db_path = Path(rel_path)
            if not db_path.is_absolute():
                db_path = Path(__file__).resolve().parent.parent / db_path
            db_path.parent.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
