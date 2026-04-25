"""Cron endpoints called by Vercel Cron / GitHub Actions.

Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel cron sends this automatically).
"""
from __future__ import annotations

import os
from datetime import date as date_cls, datetime, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request

from app.services import (
    kis_client,
    naver_rss,
    news_classifier,
    theme_score,
    theme_store,
)


router = APIRouter(prefix="/cron", tags=["cron"])


def _verify_cron(request: Request) -> None:
    secret = os.getenv("CRON_SECRET", "")
    if not secret:
        return
    auth = request.headers.get("authorization", "")
    expected = f"Bearer {secret}"
    if auth != expected:
        raise HTTPException(status_code=401, detail="invalid cron secret")


def _all_active_stock_codes() -> list[str]:
    mappings = theme_store.list_theme_stocks()
    return sorted({m["stock_code"] for m in mappings})


# ───── 1. poll-stocks (every 5 min, market hours) ─────

@router.post("/poll-stocks")
def poll_stocks(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    codes = _all_active_stock_codes()
    if not codes:
        return {"ok": True, "polled": 0, "skipped": "no codes"}

    quotes = kis_client.fetch_quotes(codes)
    snapshot_at = datetime.now(timezone.utc).isoformat()
    inserted = theme_store.insert_snapshots(snapshot_at, quotes)
    return {
        "ok": True,
        "requested": len(codes),
        "fetched": len(quotes),
        "inserted": inserted,
        "snapshot_at": snapshot_at,
    }


# ───── 2. score-themes (every 5 min, after poll-stocks) ─────

@router.post("/score-themes")
def score_themes(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    themes = theme_store.list_themes(active_only=True)
    if not themes:
        return {"ok": True, "themes": 0}

    # Single-pass DB reads.
    all_mappings = theme_store.list_theme_stocks()
    all_codes = sorted({m["stock_code"] for m in all_mappings})
    all_snapshots = theme_store.latest_snapshots(all_codes)
    news_counts = theme_store.news_count_24h_by_theme()

    # Group mappings by theme_id in memory.
    mappings_by_theme: dict[str, list[dict[str, Any]]] = {}
    for m in all_mappings:
        mappings_by_theme.setdefault(m["theme_id"], []).append(m)

    scored: list[dict[str, Any]] = []
    for t in themes:
        mappings = mappings_by_theme.get(t["id"], [])
        stock_data = []
        for m in mappings:
            snap = all_snapshots.get(m["stock_code"])
            if snap is None:
                continue
            stock_data.append({**snap, "name": m["stock_name"]})

        score = theme_score.calculate_theme_score(stock_data)
        news_count = news_counts.get(t["id"], 0)
        is_confirmed = theme_score.is_triple_confirmed(score, news_count)
        scored.append({
            "theme_id": t["id"],
            "score_dict": score,
            "is_confirmed": is_confirmed,
            "news_count_24h": news_count,
            "stock_data": stock_data,
        })

    scored.sort(key=lambda x: x["score_dict"]["score"], reverse=True)
    for rank_idx, item in enumerate(scored, start=1):
        theme_store.upsert_realtime_score(
            theme_id=item["theme_id"],
            score=item["score_dict"],
            rank=rank_idx,
            is_confirmed=item["is_confirmed"],
            news_count_24h=item["news_count_24h"],
            stocks_data=item["stock_data"],
        )

    return {
        "ok": True,
        "scored": len(scored),
        "confirmed": sum(1 for s in scored if s["is_confirmed"]),
    }


# ───── 3. poll-news (every 30 min) ─────

@router.post("/poll-news")
def poll_news(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    headlines = naver_rss.fetch_naver_finance_rss(per_feed_limit=20)
    inserted = theme_store.insert_headlines(headlines)
    return {"ok": True, "fetched": len(headlines), "inserted": inserted}


# ───── 4. classify-news (every 30 min) ─────

@router.post("/classify-news")
def classify_news(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    pending = theme_store.pending_headlines(limit=30)
    if not pending:
        return {"ok": True, "pending": 0}

    themes = theme_store.list_themes(active_only=True)
    classifications = news_classifier.classify_headlines_to_themes(
        headlines=[{"id": h["id"], "title": h["title"]} for h in pending],
        themes=[{"code": t["code"], "name": t["name"], "keywords": t["keywords"]} for t in themes],
    )

    by_id = {h["id"]: h for h in pending}
    items: list[dict[str, Any]] = []
    for c in classifications:
        hid = c.get("headline_id")
        h = by_id.get(hid)
        if h is None:
            continue
        for code in (c.get("theme_codes") or []):
            items.append({
                "theme_code": code,
                "title": h["title"],
                "url": h["url"],
                "source": h["source"],
                "published_at": h["published_at"],
            })

    inserted = theme_store.insert_theme_news(items)
    theme_store.mark_headlines_classified([h["id"] for h in pending])
    return {
        "ok": True,
        "classified": len(pending),
        "links_inserted": inserted,
    }


# ───── 5. daily-snapshot (15:35 KST) ─────

@router.post("/daily-snapshot")
def daily_snapshot(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    today = date_cls.today().isoformat()
    themes = theme_store.list_themes(active_only=True)

    all_mappings = theme_store.list_theme_stocks()
    all_codes = sorted({m["stock_code"] for m in all_mappings})
    all_snapshots = theme_store.latest_snapshots(all_codes)

    mappings_by_theme: dict[str, list[dict[str, Any]]] = {}
    for m in all_mappings:
        mappings_by_theme.setdefault(m["theme_id"], []).append(m)

    scored: list[dict[str, Any]] = []
    for t in themes:
        mappings = mappings_by_theme.get(t["id"], [])
        stock_data = []
        for m in mappings:
            snap = all_snapshots.get(m["stock_code"])
            if snap is None:
                continue
            stock_data.append({**snap, "name": m["stock_name"]})

        score = theme_score.calculate_theme_score(stock_data)
        scored.append({"theme_id": t["id"], "score_dict": score})

    scored.sort(key=lambda x: x["score_dict"]["score"], reverse=True)
    for rank_idx, item in enumerate(scored, start=1):
        theme_store.upsert_daily_score(
            date_iso=today,
            theme_id=item["theme_id"],
            score=item["score_dict"],
            rank=rank_idx,
            is_confirmed=item["score_dict"]["is_score_confirmed"],
        )

    # housekeeping: trim old snapshots
    deleted = theme_store.cleanup_old_snapshots(days=30)
    return {"ok": True, "themes": len(scored), "snapshot_date": today, "old_snapshots_deleted": deleted}
