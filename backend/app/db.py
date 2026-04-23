"""Database access — Supabase Postgres via psycopg2.

Schema is managed in `backend/schema.sql` and applied via the Supabase SQL Editor.
At runtime we only open connections; we never create or migrate tables.
"""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor


DATABASE_URL = os.getenv("DATABASE_URL", "")


class _Cursor:
    """Thin wrapper exposing just the bits the app uses."""

    def __init__(self, cur) -> None:
        self._cur = cur

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    @property
    def rowcount(self) -> int:
        return self._cur.rowcount


class _Connection:
    """sqlite3-like shim so store code can keep calling `conn.execute(...)`."""

    def __init__(self, raw) -> None:
        self._raw = raw

    def execute(self, sql: str, params: Any = ()) -> _Cursor:
        if "?" in sql:
            sql = sql.replace("?", "%s")
        cur = self._raw.cursor()
        cur.execute(sql, params)
        return _Cursor(cur)

    def executemany(self, sql: str, seq) -> _Cursor:
        if "?" in sql:
            sql = sql.replace("?", "%s")
        cur = self._raw.cursor()
        cur.executemany(sql, seq)
        return _Cursor(cur)


@contextmanager
def get_connection() -> Iterator[_Connection]:
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL env var is required. "
            "Set it to your Supabase Postgres connection string."
        )
    raw = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield _Connection(raw)
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        raw.close()


def init_db() -> None:
    """No-op on Postgres — schema is applied via `backend/schema.sql`."""
    return


# ─────────── Row deserializers (used by dashboard/news/stocks services) ───────────


def deserialize_news_row(row) -> dict[str, Any]:
    keys = row.keys()
    return {
        "id": row["id"],
        "title": row["title"],
        "summary": row["summary"],
        "source": row["source"],
        "published_at": row["published_at"],
        "importance": row["importance"],
        "analysis_status": row["analysis_status"],
        "event_type": row["event_type"],
        "origin_country": row["origin_country"] if "origin_country" in keys else "",
        "speaker": {
            **{"name": "", "type": "unknown", "country": ""},
            **(json.loads(row["speaker"]) if "speaker" in keys and row["speaker"] else {}),
        },
        "affected_countries": json.loads(row["affected_countries"]) if "affected_countries" in keys and row["affected_countries"] else [],
        "countries": json.loads(row["countries"]) if row.get("countries") else [],
        "positive_industries": json.loads(row["positive_industries"]) if row.get("positive_industries") else [],
        "negative_industries": json.loads(row["negative_industries"]) if row.get("negative_industries") else [],
        "related_symbols": json.loads(row["related_symbols"]) if row.get("related_symbols") else [],
        "ai_summary": row["ai_summary"],
        "counter_arguments": json.loads(row["counter_arguments"]) if row.get("counter_arguments") else [],
        "link": row["link"] if "link" in keys and row["link"] else "",
        "body": row["body"] if "body" in keys and row["body"] else "",
    }


def deserialize_stock_row(row) -> dict[str, Any]:
    return {
        "symbol": row["symbol"],
        "name": row["name"],
        "price": row["price"],
        "change_pct": row["change_pct"],
        "last_analysis_at": row["last_analysis_at"],
        "thesis": row["thesis"],
        "bull_points": json.loads(row["bull_points"]) if row.get("bull_points") else [],
        "risk_points": json.loads(row["risk_points"]) if row.get("risk_points") else [],
        "checkpoints": json.loads(row["checkpoints"]) if row.get("checkpoints") else [],
        "chart": json.loads(row["chart"]) if row.get("chart") else [],
        "related_news_ids": json.loads(row["related_news_ids"]) if row.get("related_news_ids") else [],
        "industry_links": json.loads(row["industry_links"]) if row.get("industry_links") else [],
    }


def get_dashboard_seed() -> dict[str, Any]:
    """Fallback dashboard config when the DB has no state row yet."""
    return {
        "date": "",
        "market_status": "OPEN",
        "last_analysis_at": "",
        "insights": {"positive_industries": [], "risk_industries": []},
        "market_indicators": [],
        "briefing_summary": "",
    }


def get_dashboard_state_row() -> dict[str, Any]:
    try:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM dashboard_state WHERE id = 1"
            ).fetchone()
    except Exception:
        row = None

    if row is None:
        config = get_dashboard_seed()
        return {
            "date": config["date"],
            "market_status": config["market_status"],
            "last_analysis_at": config["last_analysis_at"],
            "positive_industries": config["insights"]["positive_industries"],
            "risk_industries": config["insights"]["risk_industries"],
            "market_indicators": config["market_indicators"],
            "briefing_summary": config.get("briefing_summary", ""),
        }

    return {
        "date": row["date"],
        "market_status": row["market_status"],
        "last_analysis_at": row["last_analysis_at"],
        "positive_industries": json.loads(row["positive_industries"]) if row.get("positive_industries") else [],
        "risk_industries": json.loads(row["risk_industries"]) if row.get("risk_industries") else [],
        "market_indicators": json.loads(row["market_indicators"]) if row.get("market_indicators") else [],
        "briefing_summary": row["briefing_summary"],
    }
