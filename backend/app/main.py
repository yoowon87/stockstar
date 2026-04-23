from __future__ import annotations
from typing import Dict
import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dashboard import router as dashboard_router
from app.api.edge import router as edge_router
from app.api.journal import router as journal_router
from app.api.news import router as news_router
from app.api.portfolio import router as portfolio_router
from app.api.review import router as review_router
from app.api.routine import router as routine_router
from app.api.stocks import router as stocks_router


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

app.include_router(dashboard_router, prefix="/api")
app.include_router(edge_router, prefix="/api")
app.include_router(journal_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(review_router, prefix="/api")
app.include_router(routine_router, prefix="/api")
app.include_router(stocks_router, prefix="/api")


@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}
