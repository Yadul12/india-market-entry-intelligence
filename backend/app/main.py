from contextlib import asynccontextmanager
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_database
from app.routers import competitors, financials, market, overview, reports, risks, sources, strategy

_INIT_LOCK = threading.Lock()
_INITIALIZED = False


def ensure_initialized() -> None:
    """Idempotently initialize tables and seed verified baseline datasets once per process."""
    global _INITIALIZED
    if _INITIALIZED:
        return
    with _INIT_LOCK:
        if _INITIALIZED:
            return
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_database(db)
            _INITIALIZED = True
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_initialized()
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Production management consulting decision-support API for evaluating Japanese automotive "
        "components market entry into India (TAM/SAM/SOM, Competitor Intelligence, 5-Year DCF Financial Model, "
        "Scenario & Sensitivity Engine, Weighted Entry Matrix, Risk Assessment, and Executive PDF Reporting)."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(overview.router, prefix=settings.api_prefix)
app.include_router(market.router, prefix=settings.api_prefix)
app.include_router(competitors.router, prefix=settings.api_prefix)
app.include_router(financials.router, prefix=settings.api_prefix)
app.include_router(strategy.router, prefix=settings.api_prefix)
app.include_router(risks.router, prefix=settings.api_prefix)
app.include_router(sources.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
