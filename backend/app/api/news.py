"""News endpoints.

News collection (global_collector, NewsAPI, Firebase sync) is intentionally
disabled for the Vercel/Supabase deployment. Readers of /api/news simply get
whatever rows already exist in Supabase (empty until a future collector is
re-introduced).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.db import get_connection, deserialize_news_row


router = APIRouter(tags=["news"])


@router.get("/news")
def read_news() -> list[dict[str, Any]]:
    try:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM news_items ORDER BY published_at DESC LIMIT 100"
            ).fetchall()
        return [deserialize_news_row(r) for r in rows]
    except Exception:
        return []


@router.get("/news/{news_id}")
def read_news_detail(news_id: str) -> dict[str, Any]:
    try:
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM news_items WHERE id = ?", (news_id,)
            ).fetchone()
    except Exception:
        raise HTTPException(status_code=404, detail="News item not found")
    if row is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return deserialize_news_row(row)
