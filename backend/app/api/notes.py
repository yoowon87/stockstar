"""News Vault REST + Claude analyzer endpoints."""
from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import news_analyzer, notes_store


router = APIRouter(prefix="/notes", tags=["notes"])


# ─────── Schemas ───────

class StockIn(BaseModel):
    stock_code: str
    stock_name: str
    role: str = "mention"
    confidence: Optional[int] = None
    rationale: Optional[str] = None
    price_at_note: Optional[float] = None


class NoteCreate(BaseModel):
    type: str  # 'news_analysis' | 'memo' | 'observation'
    title: str
    content: Optional[str] = ""
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    source_excerpt: Optional[str] = None
    published_at: Optional[str] = None
    analysis_result: Optional[dict[str, Any]] = None
    action_window_start: Optional[str] = None
    action_window_until: Optional[str] = None
    tags: list[str] = []
    stocks: list[StockIn] = []


class NoteUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    source_excerpt: Optional[str] = None
    published_at: Optional[str] = None
    analysis_result: Optional[dict[str, Any]] = None
    action_window_start: Optional[str] = None
    action_window_until: Optional[str] = None
    verification_status: Optional[str] = None
    tags: Optional[list[str]] = None
    stocks: Optional[list[StockIn]] = None


class AnalyzeIn(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None


# ─────── CRUD ───────

@router.post("")
def create_note(payload: NoteCreate) -> dict:
    try:
        return notes_store.create_note(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("")
def list_notes(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    stock_code: Optional[str] = None,
    type: Optional[str] = None,
    verification: Optional[str] = None,
    limit: int = 50,
) -> dict:
    notes = notes_store.list_notes(
        q=q, tag=tag, stock_code=stock_code, type_=type,
        verification=verification, limit=limit,
    )
    return {"notes": notes, "count": len(notes)}


@router.get("/tags")
def list_tags(limit: int = 50) -> dict:
    return {"tags": notes_store.all_tags(limit=limit)}


@router.get("/by-stock/{stock_code}")
def by_stock(stock_code: str, limit: int = 30) -> dict:
    return {"stock_code": stock_code, "notes": notes_store.notes_for_stock(stock_code, limit=limit)}


@router.get("/usage/today")
def today_usage() -> dict:
    return notes_store.get_today_usage()


@router.get("/{note_id}")
def get_note(note_id: str) -> dict:
    row = notes_store.get_note(note_id)
    if row is None:
        raise HTTPException(status_code=404, detail="note not found")
    return row


@router.put("/{note_id}")
def update_note(note_id: str, payload: NoteUpdate) -> dict:
    row = notes_store.update_note(note_id, payload.model_dump(exclude_none=True))
    if row is None:
        raise HTTPException(status_code=404, detail="note not found")
    return row


@router.delete("/{note_id}")
def delete_note(note_id: str) -> dict:
    if not notes_store.delete_note(note_id):
        raise HTTPException(status_code=404, detail="note not found")
    return {"ok": True}


# ─────── Claude analyzer ───────

DAILY_COST_LIMIT_KRW = float(os.getenv("CLAUDE_DAILY_COST_LIMIT_KRW", "5000"))


@router.post("/analyze")
def analyze_news(payload: AnalyzeIn) -> dict:
    if not payload.url and not payload.text:
        raise HTTPException(status_code=400, detail="url 또는 text 중 하나는 필수")

    usage = notes_store.get_today_usage()
    if usage["cost_krw"] >= DAILY_COST_LIMIT_KRW:
        raise HTTPException(
            status_code=429,
            detail=f"일일 한도({DAILY_COST_LIMIT_KRW:.0f}원)를 초과했습니다. 현재 사용액: {usage['cost_krw']:.0f}원",
        )

    try:
        result = news_analyzer.analyze_url_or_text(payload.url, payload.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"분석 실패: {exc}")
    return result
