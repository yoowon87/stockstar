from __future__ import annotations
import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from app.services.data_repository import (
    get_dashboard_config,
    get_news_items,
    get_stock_details,
)


ROOT_DIR = Path(__file__).resolve().parents[2]
DB_DIR = ROOT_DIR / "storage"
DB_PATH = Path(os.getenv("STOCKSTAR_DB_PATH", DB_DIR / "stockstar.db"))


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS news_items (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                summary TEXT NOT NULL,
                source TEXT NOT NULL,
                published_at TEXT NOT NULL,
                importance TEXT NOT NULL,
                analysis_status TEXT NOT NULL,
                event_type TEXT NOT NULL,
                origin_country TEXT NOT NULL DEFAULT '',
                speaker TEXT NOT NULL DEFAULT '{}',
                affected_countries TEXT NOT NULL DEFAULT '[]',
                countries TEXT NOT NULL,
                positive_industries TEXT NOT NULL,
                negative_industries TEXT NOT NULL,
                related_symbols TEXT NOT NULL,
                ai_summary TEXT NOT NULL,
                counter_arguments TEXT NOT NULL,
                analyzed_at TEXT,
                link TEXT DEFAULT '',
                body TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS stock_details (
                symbol TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL,
                change_pct REAL NOT NULL,
                last_analysis_at TEXT NOT NULL,
                thesis TEXT NOT NULL,
                bull_points TEXT NOT NULL,
                risk_points TEXT NOT NULL,
                checkpoints TEXT NOT NULL,
                chart TEXT NOT NULL,
                related_news_ids TEXT NOT NULL,
                industry_links TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dashboard_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                date TEXT NOT NULL,
                market_status TEXT NOT NULL,
                last_analysis_at TEXT NOT NULL,
                positive_industries TEXT NOT NULL,
                risk_industries TEXT NOT NULL,
                market_indicators TEXT NOT NULL,
                briefing_summary TEXT NOT NULL
            );
            """
        )

        # Migration: add link + body columns if missing
        try:
            connection.execute("ALTER TABLE news_items ADD COLUMN link TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        try:
            connection.execute("ALTER TABLE news_items ADD COLUMN body TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass

        connection.executemany(
            """
            INSERT OR REPLACE INTO news_items (
                id, title, summary, source, published_at, importance,
                analysis_status, event_type, origin_country, speaker,
                affected_countries, countries, positive_industries,
                negative_industries, related_symbols, ai_summary,
                counter_arguments, analyzed_at
            ) VALUES (
                :id, :title, :summary, :source, :published_at, :importance,
                :analysis_status, :event_type, :origin_country, :speaker,
                :affected_countries, :countries, :positive_industries,
                :negative_industries, :related_symbols, :ai_summary,
                :counter_arguments, :analyzed_at
            )
            """,
            [_serialize_news_item(item) for item in get_news_items()],
        )

        stock_count = connection.execute("SELECT COUNT(*) FROM stock_details").fetchone()[0]
        if stock_count == 0:
            connection.executemany(
                """
                INSERT INTO stock_details (
                    symbol, name, price, change_pct, last_analysis_at, thesis,
                    bull_points, risk_points, checkpoints, chart,
                    related_news_ids, industry_links
                ) VALUES (
                    :symbol, :name, :price, :change_pct, :last_analysis_at, :thesis,
                    :bull_points, :risk_points, :checkpoints, :chart,
                    :related_news_ids, :industry_links
                )
                """,
                [_serialize_stock_item(item) for item in get_stock_details().values()],
            )

        dashboard_count = connection.execute(
            "SELECT COUNT(*) FROM dashboard_state"
        ).fetchone()[0]
        if dashboard_count == 0:
            config = get_dashboard_config()
            connection.execute(
                """
                INSERT INTO dashboard_state (
                    id, date, market_status, last_analysis_at,
                    positive_industries, risk_industries,
                    market_indicators, briefing_summary
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    config["date"],
                    config["market_status"],
                    config["last_analysis_at"],
                    json.dumps(config["insights"]["positive_industries"]),
                    json.dumps(config["insights"]["risk_industries"]),
                    json.dumps(config["market_indicators"]),
                    config.get(
                        "briefing_summary",
                        "AI infrastructure and semiconductor demand remain the lead focus for the current watchlist.",
                    ),
                ),
            )


def _serialize_news_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        **item,
        "origin_country": item.get("origin_country", ""),
        "speaker": json.dumps(item.get("speaker", {"name": "", "type": "unknown", "country": ""})),
        "affected_countries": json.dumps(item.get("affected_countries", [])),
        "countries": json.dumps(item["countries"]),
        "positive_industries": json.dumps(item["positive_industries"]),
        "negative_industries": json.dumps(item["negative_industries"]),
        "related_symbols": json.dumps(item["related_symbols"]),
        "counter_arguments": json.dumps(item["counter_arguments"]),
        "analyzed_at": item.get("analyzed_at"),
    }


def _serialize_stock_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        **item,
        "bull_points": json.dumps(item["bull_points"]),
        "risk_points": json.dumps(item["risk_points"]),
        "checkpoints": json.dumps(item["checkpoints"]),
        "chart": json.dumps(item["chart"]),
        "related_news_ids": json.dumps(item["related_news_ids"]),
        "industry_links": json.dumps(item["industry_links"]),
    }


def deserialize_news_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "summary": row["summary"],
        "source": row["source"],
        "published_at": row["published_at"],
        "importance": row["importance"],
        "analysis_status": row["analysis_status"],
        "event_type": row["event_type"],
        "origin_country": row["origin_country"] if "origin_country" in row.keys() else "",
        "speaker": json.loads(row["speaker"]) if "speaker" in row.keys() else {"name": "", "type": "unknown", "country": ""},
        "affected_countries": json.loads(row["affected_countries"]) if "affected_countries" in row.keys() else [],
        "countries": json.loads(row["countries"]),
        "positive_industries": json.loads(row["positive_industries"]),
        "negative_industries": json.loads(row["negative_industries"]),
        "related_symbols": json.loads(row["related_symbols"]),
        "ai_summary": row["ai_summary"],
        "counter_arguments": json.loads(row["counter_arguments"]),
        "link": row["link"] if "link" in row.keys() else "",
        "body": row["body"] if "body" in row.keys() else "",
    }


def deserialize_stock_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "symbol": row["symbol"],
        "name": row["name"],
        "price": row["price"],
        "change_pct": row["change_pct"],
        "last_analysis_at": row["last_analysis_at"],
        "thesis": row["thesis"],
        "bull_points": json.loads(row["bull_points"]),
        "risk_points": json.loads(row["risk_points"]),
        "checkpoints": json.loads(row["checkpoints"]),
        "chart": json.loads(row["chart"]),
        "related_news_ids": json.loads(row["related_news_ids"]),
        "industry_links": json.loads(row["industry_links"]),
    }


def get_dashboard_seed() -> dict[str, Any]:
    return get_dashboard_config()


def get_dashboard_state_row() -> dict[str, Any]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM dashboard_state WHERE id = 1"
        ).fetchone()

    if row is None:
        config = get_dashboard_config()
        return {
            "date": config["date"],
            "market_status": config["market_status"],
            "last_analysis_at": config["last_analysis_at"],
            "positive_industries": config["insights"]["positive_industries"],
            "risk_industries": config["insights"]["risk_industries"],
            "market_indicators": config["market_indicators"],
            "briefing_summary": config.get(
                "briefing_summary",
                "AI infrastructure and semiconductor demand remain the lead focus for the current watchlist.",
            ),
        }

    return {
        "date": row["date"],
        "market_status": row["market_status"],
        "last_analysis_at": row["last_analysis_at"],
        "positive_industries": json.loads(row["positive_industries"]),
        "risk_industries": json.loads(row["risk_industries"]),
        "market_indicators": json.loads(row["market_indicators"]),
        "briefing_summary": row["briefing_summary"],
    }
