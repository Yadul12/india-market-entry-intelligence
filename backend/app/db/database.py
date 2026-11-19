from collections.abc import Generator
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _normalize_postgres_url(url: str) -> str:
    """Normalize standard postgres:// or postgresql:// URLs to SQLAlchemy psycopg3 driver."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _sqlite_fallback_path() -> Path:
    if os.environ.get("VERCEL"):
        return Path("/tmp/india_market_entry.db")
    fallback_path = Path(__file__).resolve().parent.parent.parent / "data" / "india_market_entry.db"
    fallback_path.parent.mkdir(parents=True, exist_ok=True)
    return fallback_path


def _resolve_database_url() -> tuple[str, str]:
    """
    Resolve database connection string.
    - Supports POSTGRES_URL / DATABASE_URL (Neon, Supabase, Vercel Postgres, local PostgreSQL).
    - Gracefully falls back to writable SQLite (/tmp on Vercel serverless, ./data locally)
      if PostgreSQL is not configured or unreachable.
    """
    settings = get_settings()
    raw_url = (
        os.environ.get("POSTGRES_URL")
        or os.environ.get("DATABASE_URL")
        or settings.database_url
    )

    if raw_url.startswith(("postgres://", "postgresql")):
        pg_url = _normalize_postgres_url(raw_url)
        try:
            test_engine = create_engine(pg_url, pool_pre_ping=True, connect_args={"connect_timeout": 4})
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            test_engine.dispose()
            return pg_url, "postgresql"
        except Exception:
            fb = _sqlite_fallback_path()
            return f"sqlite:///{fb.as_posix()}", "sqlite-fallback"

    if raw_url.startswith("sqlite:///"):
        if os.environ.get("VERCEL"):
            fb = _sqlite_fallback_path()
            return f"sqlite:///{fb.as_posix()}", "sqlite-tmp"
        rel = raw_url.replace("sqlite:///", "", 1)
        path = Path(rel)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent.parent.parent / path
        path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{path.as_posix()}", "sqlite"

    return raw_url, "custom"


RESOLVED_DB_URL, ACTIVE_DB_ENGINE = _resolve_database_url()

connect_args = {"check_same_thread": False} if RESOLVED_DB_URL.startswith("sqlite") else {}
engine = create_engine(
    RESOLVED_DB_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
