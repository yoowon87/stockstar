"""Theme Radar read & admin endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import kis_client, theme_store


router = APIRouter(prefix="/theme", tags=["theme"])


# ─── read ───

@router.get("/radar")
def get_radar(top: int = 10) -> dict[str, Any]:
    rows = theme_store.get_realtime_radar(top_n=top)
    return {"top": top, "themes": rows}


@router.get("/calendar")
def get_calendar(start: str, end: str) -> dict[str, Any]:
    days = theme_store.calendar_top_per_day(start, end)
    return {"start": start, "end": end, "days": days}


@router.get("/history/{date_iso}")
def get_history(date_iso: str, top: int = 10) -> dict[str, Any]:
    rows = theme_store.daily_top_themes(date_iso, top_n=top)
    return {"date": date_iso, "themes": rows}


@router.get("/by-code/{code}")
def get_by_code(code: str) -> dict[str, Any]:
    t = theme_store.get_theme_by_code(code)
    if t is None:
        raise HTTPException(status_code=404, detail="theme not found")
    stocks = theme_store.list_theme_stocks(theme_id=t["id"])
    return {"theme": t, "stocks": stocks}


# ─── KIS daily chart for a single stock ───

@router.get("/stock/{stock_code}/chart")
def get_stock_chart(stock_code: str, days: int = 60) -> dict[str, Any]:
    days = max(5, min(days, 250))
    return kis_client.fetch_daily_chart(stock_code, days=days)


@router.get("/stock/{stock_code}/summary")
def get_stock_summary(stock_code: str) -> dict[str, Any]:
    return kis_client.fetch_stock_summary(stock_code)


# ─── admin ───

class ThemeUpsertIn(BaseModel):
    code: str
    name: str
    category: str
    category_name: str
    description: str | None = None
    keywords: list[str] = []
    is_active: bool = True
    display_order: int = 0


class ThemeStockIn(BaseModel):
    stock_code: str
    stock_name: str
    is_leader: bool = False
    weight: int = 2
    note: str | None = None


@router.get("/admin/themes")
def admin_list_themes() -> dict[str, Any]:
    themes = theme_store.list_themes(active_only=False)
    all_mappings = theme_store.list_theme_stocks()
    groups: dict[str, list] = {}
    for m in all_mappings:
        groups.setdefault(m["theme_id"], []).append(m)
    for t in themes:
        stocks = groups.get(t["id"], [])
        t["stock_count"] = len(stocks)
        t["stocks"] = stocks
    return {"themes": themes}


@router.post("/admin/themes")
def admin_upsert_theme(payload: ThemeUpsertIn) -> dict[str, Any]:
    return theme_store.upsert_theme(payload.model_dump())


@router.post("/admin/themes/{theme_code}/stocks")
def admin_add_stock(theme_code: str, payload: ThemeStockIn) -> dict[str, Any]:
    theme_store.add_theme_stock(theme_code, payload.model_dump())
    return {"ok": True}


@router.delete("/admin/themes/{theme_code}/stocks/{stock_code}")
def admin_remove_stock(theme_code: str, stock_code: str) -> dict[str, Any]:
    theme_store.remove_theme_stock(theme_code, stock_code)
    return {"ok": True}
