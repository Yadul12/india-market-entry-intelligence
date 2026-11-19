from contextlib import asynccontextmanager
from pathlib import Path
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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

# Serve built Vite SPA static bundle when packaged for unified deployment (e.g., Vercel / single-container)
STATIC_UI_DIR = Path(__file__).resolve().parent.parent / "static_ui"
if (STATIC_UI_DIR / "index.html").is_file():
    assets_dir = STATIC_UI_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")

    @app.get("/", include_in_schema=False)
    def serve_spa_root():
        return FileResponse(STATIC_UI_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API endpoint not found.")
        candidate = (STATIC_UI_DIR / full_path).resolve()
        if candidate.is_file() and STATIC_UI_DIR.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(STATIC_UI_DIR / "index.html")
