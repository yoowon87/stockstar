from __future__ import annotations
from typing import Dict
import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.api.cron import router as cron_router
from app.api.dashboard import router as dashboard_router
from app.api.edge import router as edge_router
from app.api.journal import router as journal_router
from app.api.news import router as news_router
from app.api.portfolio import router as portfolio_router
from app.api.review import router as review_router
from app.api.routine import router as routine_router
from app.api.stocks import router as stocks_router
from app.api.theme import router as theme_router


app = FastAPI(
    title="StockStar API",
    version="0.2.0",
    description="Personal investment OS — journal, portfolio, edge research.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── App-level password gate ────────────────────────────────────────────────
# All /api/* requests require X-App-Token == APP_PASSWORD env, except:
#   - /api/cron/*  (uses CRON_SECRET via Authorization header instead)
#   - /api/auth/verify (uses the same X-App-Token; let middleware check it)
# If APP_PASSWORD env is unset, the gate is disabled (dev fallback).

_AUTH_EXEMPT_PREFIXES = ("/api/cron/",)


class AppPasswordMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if request.method == "OPTIONS":
            return await call_next(request)
        if not path.startswith("/api/"):
            return await call_next(request)
        if any(path.startswith(p) for p in _AUTH_EXEMPT_PREFIXES):
            return await call_next(request)

        expected = os.getenv("APP_PASSWORD", "")
        if not expected:
            # No password configured -> open access (local dev convenience).
            return await call_next(request)

        token = request.headers.get("x-app-token", "")
        if token != expected:
            return JSONResponse({"detail": "unauthorized"}, status_code=401)
        return await call_next(request)


app.add_middleware(AppPasswordMiddleware)


@app.get("/api/auth/verify")
def auth_verify() -> dict[str, bool]:
    """Reachable only when X-App-Token is valid (middleware enforces)."""
    return {"ok": True}

app.include_router(cron_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(edge_router, prefix="/api")
app.include_router(journal_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(routine_router, prefix="/api")
app.include_router(stocks_router, prefix="/api")
app.include_router(theme_router, prefix="/api")


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}
