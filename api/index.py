"""Vercel Python Serverless entry point.

Vercel auto-detects the ASGI `app` symbol and routes all `/api/*` requests here
(see `vercel.json` rewrites). The FastAPI app lives in `backend/app/main.py`.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make the `backend` directory importable as a package root.
_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.main import app  # noqa: E402,F401  (exported for Vercel)
