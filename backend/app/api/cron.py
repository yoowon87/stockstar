"""Cron endpoints called by Vercel Cron / GitHub Actions.

Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel cron sends this automatically).
"""
from __future__ import annotations

import os
from datetime import date as date_cls, datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.services import kis_client, notes_store, theme_score, theme_store


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
# Chunkable via ?offset=&limit= so the workflow can split work across calls
# and stay under Vercel's 60s function ceiling. Default = all codes.

@router.post("/poll-stocks")
def poll_stocks(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    codes = _all_active_stock_codes()
    total = len(codes)
    if not codes:
        return {"ok": True, "polled": 0, "skipped": "no codes"}

    try:
        offset = max(0, int(request.query_params.get("offset", "0")))
    except ValueError:
        offset = 0
    try:
        limit_raw = request.query_params.get("limit")
        limit = int(limit_raw) if limit_raw is not None else len(codes)
    except ValueError:
        limit = len(codes)
    chunk = codes[offset : offset + limit] if limit > 0 else codes[offset:]

    if not chunk:
        return {"ok": True, "polled": 0, "skipped": "empty chunk", "total": total}

    quotes = kis_client.fetch_quotes(chunk)
    snapshot_at = datetime.now(timezone.utc).isoformat()
    inserted = theme_store.insert_snapshots(snapshot_at, quotes)
    return {
        "ok": True,
        "total": total,
        "offset": offset,
        "limit": limit,
        "requested": len(chunk),
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
        scored.append({
            "theme_id": t["id"],
            "score_dict": score,
            "is_confirmed": score["is_score_confirmed"],
            "stock_data": stock_data,
        })

    scored.sort(key=lambda x: x["score_dict"]["score"], reverse=True)
    bulk_items = [
        {
            "theme_id": item["theme_id"],
            "score": item["score_dict"],
            "rank": rank_idx,
            "is_confirmed": item["is_confirmed"],
            "news_count_24h": 0,
            "stocks_data": item["stock_data"],
        }
        for rank_idx, item in enumerate(scored, start=1)
    ]
    theme_store.upsert_realtime_scores_bulk(bulk_items)

    return {
        "ok": True,
        "scored": len(scored),
        "confirmed": sum(1 for s in scored if s["is_confirmed"]),
    }


# ───── 3. daily-snapshot (15:35 KST) ─────

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
    bulk_items = [
        {
            "theme_id": item["theme_id"],
            "score": item["score_dict"],
            "rank": rank_idx,
            "is_confirmed": item["score_dict"]["is_score_confirmed"],
        }
        for rank_idx, item in enumerate(scored, start=1)
    ]
    theme_store.upsert_daily_scores_bulk(today, bulk_items)

    deleted = theme_store.cleanup_old_snapshots(days=30)
    return {"ok": True, "themes": len(scored), "snapshot_date": today, "old_snapshots_deleted": deleted}


# ───── 4. track-note-prices (16:35 KST after market close) ─────

@router.post("/track-note-prices")
def track_note_prices(request: Request) -> dict[str, Any]:
    _verify_cron(request)
    summary = {}
    touched_notes: set[str] = set()
    for window in ("1d", "7d", "30d"):
        pairs = notes_store.stock_codes_needing_update(window)
        if not pairs:
            summary[window] = 0
            continue
        codes = sorted({code for _nid, code in pairs})
        quotes = kis_client.fetch_quotes(codes)
        updated = 0
        for note_id, code in pairs:
            q = quotes.get(code)
            if q is None or q.get("price") is None:
                continue
            notes_store.write_price_update(note_id, code, window, float(q["price"]))
            touched_notes.add(note_id)
            updated += 1
        summary[window] = updated

    for note_id in touched_notes:
        try:
            notes_store.auto_verify(note_id)
        except Exception:
            continue

    return {"ok": True, "updates": summary, "notes_verified_checked": len(touched_notes)}
