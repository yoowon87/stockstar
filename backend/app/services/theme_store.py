"""CRUD + read helpers for Theme Radar tables."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ───── Themes & mappings ─────

def list_themes(active_only: bool = True) -> list[dict[str, Any]]:
    sql = "SELECT * FROM themes"
    if active_only:
        sql += " WHERE is_active = true"
    sql += " ORDER BY display_order ASC, code ASC"
    with get_connection() as conn:
        rows = conn.execute(sql).fetchall()
    return [_row_to_theme(r) for r in rows]


def get_theme_by_code(code: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM themes WHERE code = ?", (code,)).fetchone()
    return _row_to_theme(row) if row else None


def list_theme_stocks(theme_id: str | None = None) -> list[dict[str, Any]]:
    """All theme-stock mappings; optionally filtered to one theme."""
    if theme_id:
        sql = "SELECT * FROM theme_stocks WHERE theme_id = ? ORDER BY weight ASC, is_leader DESC"
        params: tuple = (theme_id,)
    else:
        sql = "SELECT * FROM theme_stocks ORDER BY theme_id, weight ASC"
        params = ()
    with get_connection() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_row_to_theme_stock(r) for r in rows]


def upsert_theme(payload: dict[str, Any]) -> dict[str, Any]:
    code = payload["code"]
    with get_connection() as conn:
        existing = conn.execute("SELECT id FROM themes WHERE code = ?", (code,)).fetchone()
        if existing:
            conn.execute(
                """UPDATE themes SET
                       name = ?, category = ?, category_name = ?,
                       description = ?, keywords = ?, is_active = ?,
                       display_order = ?, updated_at = now()
                   WHERE code = ?""",
                (
                    payload["name"],
                    payload["category"],
                    payload["category_name"],
                    payload.get("description"),
                    payload.get("keywords", []),
                    payload.get("is_active", True),
                    payload.get("display_order", 0),
                    code,
                ),
            )
        else:
            conn.execute(
                """INSERT INTO themes (code, name, category, category_name,
                       description, keywords, is_active, display_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    code,
                    payload["name"],
                    payload["category"],
                    payload["category_name"],
                    payload.get("description"),
                    payload.get("keywords", []),
                    payload.get("is_active", True),
                    payload.get("display_order", 0),
                ),
            )
    return get_theme_by_code(code) or {}


def add_theme_stock(theme_code: str, payload: dict[str, Any]) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO theme_stocks (theme_id, stock_code, stock_name, is_leader, weight, note)
               SELECT id, ?, ?, ?, ?, ? FROM themes WHERE code = ?
               ON CONFLICT (theme_id, stock_code) DO UPDATE
                 SET stock_name = EXCLUDED.stock_name,
                     is_leader = EXCLUDED.is_leader,
                     weight = EXCLUDED.weight,
                     note = EXCLUDED.note""",
            (
                payload["stock_code"],
                payload["stock_name"],
                payload.get("is_leader", False),
                payload.get("weight", 2),
                payload.get("note"),
                theme_code,
            ),
        )


def remove_theme_stock(theme_code: str, stock_code: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """DELETE FROM theme_stocks
                WHERE stock_code = ?
                  AND theme_id = (SELECT id FROM themes WHERE code = ?)""",
            (stock_code, theme_code),
        )


# ───── Snapshots ─────

def insert_snapshots(snapshot_at_iso: str, quotes: dict[str, dict[str, Any]]) -> int:
    """Bulk insert one row per stock. Returns inserted count."""
    if not quotes:
        return 0
    with get_connection() as conn:
        rows = [
            (
                code,
                snapshot_at_iso,
                q.get("price"),
                q.get("change_pct"),
                q.get("volume"),
                q.get("trade_amount"),
                q.get("market_cap"),
            )
            for code, q in quotes.items()
        ]
        conn.executemany(
            """INSERT INTO stock_snapshots (
                   stock_code, snapshot_at, price, change_pct, volume, trade_amount, market_cap
               ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            rows,
        )
    return len(quotes)


def latest_snapshots(stock_codes: list[str]) -> dict[str, dict[str, Any]]:
    """Return most recent snapshot per code (within last 30 minutes)."""
    if not stock_codes:
        return {}
    placeholders = ",".join(["%s"] * len(stock_codes))
    sql = (
        "SELECT DISTINCT ON (stock_code) stock_code, snapshot_at, price, change_pct, "
        "volume, trade_amount, market_cap "
        "FROM stock_snapshots "
        f"WHERE stock_code IN ({placeholders}) "
        "AND snapshot_at > (now() - interval '60 minutes') "
        "ORDER BY stock_code, snapshot_at DESC"
    )
    with get_connection() as conn:
        rows = conn.execute(sql, tuple(stock_codes)).fetchall()
    return {
        r["stock_code"]: {
            "code": r["stock_code"],
            "snapshot_at": r["snapshot_at"].isoformat() if r["snapshot_at"] else None,
            "price": float(r["price"]) if r["price"] is not None else None,
            "change_pct": float(r["change_pct"]) if r["change_pct"] is not None else 0.0,
            "volume": int(r["volume"] or 0),
            "trade_amount": int(r["trade_amount"] or 0),
            "market_cap": int(r["market_cap"] or 0),
        }
        for r in rows
    }


def cleanup_old_snapshots(days: int = 30) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM stock_snapshots WHERE snapshot_at < now() - (%s || ' days')::interval",
            (str(days),),
        )
        return cur.rowcount


# ───── Realtime scores ─────

_UPSERT_REALTIME_SQL = """
INSERT INTO realtime_theme_scores (
    theme_id, updated_at, total_amount, avg_change, rising_ratio,
    score, rank, is_confirmed,
    leader_code, leader_name, leader_change,
    news_count_24h, stocks_data
) VALUES (%s, now(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
ON CONFLICT (theme_id) DO UPDATE SET
    updated_at = now(),
    total_amount = EXCLUDED.total_amount,
    avg_change = EXCLUDED.avg_change,
    rising_ratio = EXCLUDED.rising_ratio,
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    is_confirmed = EXCLUDED.is_confirmed,
    leader_code = EXCLUDED.leader_code,
    leader_name = EXCLUDED.leader_name,
    leader_change = EXCLUDED.leader_change,
    news_count_24h = EXCLUDED.news_count_24h,
    stocks_data = EXCLUDED.stocks_data
"""


def upsert_realtime_scores_bulk(items: list[dict[str, Any]]) -> None:
    """Single-connection bulk upsert. `items` = list of dicts with keys:
    theme_id, score (dict), rank, is_confirmed, news_count_24h, stocks_data.
    """
    if not items:
        return
    rows = [
        (
            it["theme_id"],
            it["score"]["total_amount"],
            it["score"]["avg_change"],
            it["score"]["rising_ratio"],
            it["score"]["score"],
            it["rank"],
            it["is_confirmed"],
            it["score"]["leader_code"],
            it["score"]["leader_name"],
            it["score"]["leader_change"],
            it["news_count_24h"],
            json.dumps(it["stocks_data"]),
        )
        for it in items
    ]
    with get_connection() as conn:
        conn.executemany(_UPSERT_REALTIME_SQL, rows)


def upsert_realtime_score(
    theme_id: str,
    score: dict[str, Any],
    rank: int,
    is_confirmed: bool,
    news_count_24h: int,
    stocks_data: list[dict[str, Any]],
) -> None:
    """Single-row variant; prefer `upsert_realtime_scores_bulk` for cron."""
    upsert_realtime_scores_bulk([{
        "theme_id": theme_id,
        "score": score,
        "rank": rank,
        "is_confirmed": is_confirmed,
        "news_count_24h": news_count_24h,
        "stocks_data": stocks_data,
    }])


def get_realtime_radar(top_n: int = 10) -> list[dict[str, Any]]:
    """Returns realtime scores joined with theme metadata, ordered by rank."""
    sql = """
        SELECT r.*, t.code, t.name, t.category, t.category_name
          FROM realtime_theme_scores r
          JOIN themes t ON t.id = r.theme_id
         WHERE t.is_active = true
         ORDER BY r.rank ASC NULLS LAST, r.score DESC
         LIMIT %s
    """
    with get_connection() as conn:
        rows = conn.execute(sql, (top_n,)).fetchall()
    out = []
    for r in rows:
        out.append({
            "theme_id": str(r["theme_id"]),
            "code": r["code"],
            "name": r["name"],
            "category": r["category"],
            "category_name": r["category_name"],
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            "total_amount": int(r["total_amount"] or 0),
            "avg_change": float(r["avg_change"] or 0),
            "rising_ratio": float(r["rising_ratio"] or 0),
            "score": float(r["score"] or 0),
            "rank": r["rank"],
            "is_confirmed": bool(r["is_confirmed"]),
            "leader_code": r["leader_code"],
            "leader_name": r["leader_name"],
            "leader_change": float(r["leader_change"] or 0),
            "news_count_24h": r["news_count_24h"],
            "stocks": _as_list(r["stocks_data"]),
        })
    return out


# ───── Daily scores (calendar heatmap) ─────

_UPSERT_DAILY_SQL = """
INSERT INTO daily_theme_scores (
    date, theme_id, total_amount, avg_change, rising_ratio,
    score, rank, is_confirmed,
    leader_code, leader_name, leader_change, rising_stocks
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
ON CONFLICT (date, theme_id) DO UPDATE SET
    total_amount = EXCLUDED.total_amount,
    avg_change = EXCLUDED.avg_change,
    rising_ratio = EXCLUDED.rising_ratio,
    score = EXCLUDED.score,
    rank = EXCLUDED.rank,
    is_confirmed = EXCLUDED.is_confirmed,
    leader_code = EXCLUDED.leader_code,
    leader_name = EXCLUDED.leader_name,
    leader_change = EXCLUDED.leader_change,
    rising_stocks = EXCLUDED.rising_stocks
"""


def upsert_daily_scores_bulk(date_iso: str, items: list[dict[str, Any]]) -> None:
    """Bulk variant. `items` = list of {theme_id, score, rank, is_confirmed}."""
    if not items:
        return
    rows = [
        (
            date_iso,
            it["theme_id"],
            it["score"]["total_amount"],
            it["score"]["avg_change"],
            it["score"]["rising_ratio"],
            it["score"]["score"],
            it["rank"],
            it["is_confirmed"],
            it["score"]["leader_code"],
            it["score"]["leader_name"],
            it["score"]["leader_change"],
            json.dumps(it["score"].get("rising_stocks", [])),
        )
        for it in items
    ]
    with get_connection() as conn:
        conn.executemany(_UPSERT_DAILY_SQL, rows)


def upsert_daily_score(
    date_iso: str,
    theme_id: str,
    score: dict[str, Any],
    rank: int,
    is_confirmed: bool,
) -> None:
    upsert_daily_scores_bulk(date_iso, [{
        "theme_id": theme_id, "score": score, "rank": rank, "is_confirmed": is_confirmed,
    }])


def calendar_top_per_day(start_date: str, end_date: str) -> list[dict[str, Any]]:
    """Return rank-1 theme for each date in range."""
    sql = """
        SELECT d.date, d.score, d.is_confirmed, d.leader_code, d.leader_name, d.leader_change,
               t.code AS theme_code, t.name AS theme_name, t.category
          FROM daily_theme_scores d
          JOIN themes t ON t.id = d.theme_id
         WHERE d.date BETWEEN %s AND %s
           AND d.rank = 1
         ORDER BY d.date ASC
    """
    with get_connection() as conn:
        rows = conn.execute(sql, (start_date, end_date)).fetchall()
    return [{
        "date": r["date"].isoformat() if r["date"] else None,
        "theme_code": r["theme_code"],
        "theme_name": r["theme_name"],
        "category": r["category"],
        "score": float(r["score"] or 0),
        "is_confirmed": bool(r["is_confirmed"]),
        "leader_code": r["leader_code"],
        "leader_name": r["leader_name"],
        "leader_change": float(r["leader_change"] or 0),
    } for r in rows]


def daily_top_themes(date_iso: str, top_n: int = 10) -> list[dict[str, Any]]:
    sql = """
        SELECT d.*, t.code AS theme_code, t.name AS theme_name, t.category, t.category_name
          FROM daily_theme_scores d
          JOIN themes t ON t.id = d.theme_id
         WHERE d.date = %s
         ORDER BY d.rank ASC
         LIMIT %s
    """
    with get_connection() as conn:
        rows = conn.execute(sql, (date_iso, top_n)).fetchall()
    return [{
        "date": r["date"].isoformat() if r["date"] else None,
        "theme_code": r["theme_code"],
        "theme_name": r["theme_name"],
        "category": r["category"],
        "category_name": r["category_name"],
        "rank": r["rank"],
        "score": float(r["score"] or 0),
        "total_amount": int(r["total_amount"] or 0),
        "avg_change": float(r["avg_change"] or 0),
        "rising_ratio": float(r["rising_ratio"] or 0),
        "is_confirmed": bool(r["is_confirmed"]),
        "leader_code": r["leader_code"],
        "leader_name": r["leader_name"],
        "leader_change": float(r["leader_change"] or 0),
        "rising_stocks": _as_list(r["rising_stocks"]),
    } for r in rows]


# ───── Helpers ─────

def _as_list(value: Any) -> list:
    """JSONB columns come back as Python list/dict already; tolerate string too."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return [value]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except Exception:
            return []
        return parsed if isinstance(parsed, list) else [parsed]
    return []


def _row_to_theme(r) -> dict[str, Any]:
    return {
        "id": str(r["id"]),
        "code": r["code"],
        "name": r["name"],
        "category": r["category"],
        "category_name": r["category_name"],
        "description": r.get("description") if hasattr(r, "get") else r["description"],
        "keywords": list(r["keywords"] or []),
        "is_active": bool(r["is_active"]),
        "display_order": r["display_order"],
    }


def _row_to_theme_stock(r) -> dict[str, Any]:
    return {
        "theme_id": str(r["theme_id"]),
        "stock_code": r["stock_code"],
        "stock_name": r["stock_name"],
        "is_leader": bool(r["is_leader"]),
        "weight": r["weight"],
        "note": r.get("note") if hasattr(r, "get") else r["note"],
    }
