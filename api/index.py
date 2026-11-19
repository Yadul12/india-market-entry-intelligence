"""Vercel Python Fluid Compute ASGI Entrypoint."""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app, ensure_initialized  # noqa: E402

# Guarantee schema creation and idempotent baseline seeding on serverless cold start
ensure_initialized()

__all__ = ["app"]
