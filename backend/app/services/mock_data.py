from datetime import datetime, timezone
import json

from app.db import (
    deserialize_news_row,
    deserialize_stock_row,
    get_connection,
    get_dashboard_state_row,
)
from app.services.news_collector import fetch_google_news
from app.services.data_repository import (
    get_watchlist as load_watchlist,
)


def get_dashboard_payload() -> dict:
    config = get_dashboard_state_row()
    news_items = get_news_list()
    watchlist = get_watchlist()

    return {
        "date": config["date"],
        "market_status": config["market_status"],
        "last_analysis_at": config["last_analysis_at"],
        "briefing_summary": config["briefing_summary"],
        "headline_news": [
            {
                "id": item["id"],
                "title": item["title"],
                "importance": item["importance"],
                "published_at": item["published_at"],
            }
            for item in news_items[:3]
        ],
        "insights": {
            "positive_industries": config["positive_industries"],
            "risk_industries": config["risk_industries"],
            "focus_symbols": watchlist[:2],
        },
        "market_indicators": config["market_indicators"],
        "watchlist": watchlist,
    }


def get_news_list() -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM news_items ORDER BY published_at DESC"
        ).fetchall()
    return [deserialize_news_row(row) for row in rows]


def get_news_detail(news_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM news_items WHERE id = ?",
            (news_id,),
        ).fetchone()
    return deserialize_news_row(row) if row else None


def get_watchlist() -> list[dict]:
    watchlist = load_watchlist()
    watch_symbols = [item["symbol"] for item in watchlist]
    placeholders = ",".join("?" for _ in watch_symbols)

    with get_connection() as connection:
        rows = connection.execute(
            f"SELECT symbol, name, price, change_pct, thesis FROM stock_details "
            f"WHERE symbol IN ({placeholders})",
            tuple(watch_symbols),
        ).fetchall()

    by_symbol = {row["symbol"]: dict(row) for row in rows}
    return [by_symbol[symbol] for symbol in watch_symbols if symbol in by_symbol]


def get_stock_detail(symbol: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM stock_details WHERE symbol = ?",
            (symbol,),
        ).fetchone()
    return deserialize_stock_row(row) if row else None


def analyze_news_item(news_id: str) -> dict | None:
    item = get_news_detail(news_id)
    if item is None:
        return None

    analyzed_at = datetime.now(timezone.utc).isoformat()
    refreshed_summary = (
        f"{item['ai_summary']} Review refreshed at {analyzed_at[:19]}Z for dashboard reporting."
    )

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE news_items
            SET analysis_status = ?, ai_summary = ?, analyzed_at = ?
            WHERE id = ?
            """,
            ("analyzed", refreshed_summary, analyzed_at, news_id),
        )

    return get_news_detail(news_id)


def analyze_stock_item(symbol: str) -> dict | None:
    item = get_stock_detail(symbol)
    if item is None:
        return None

    analyzed_at = datetime.now(timezone.utc).isoformat()
    refreshed_thesis = (
        f"{item['thesis']} Last refreshed from the local analysis action at {analyzed_at[:19]}Z."
    )

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE stock_details
            SET thesis = ?, last_analysis_at = ?
            WHERE symbol = ?
            """,
            (refreshed_thesis, analyzed_at, symbol),
        )

    return get_stock_detail(symbol)


def sync_live_news() -> dict[str, int]:
    live_items = fetch_google_news()
    inserted_count = 0

    with get_connection() as connection:
        for item in live_items:
            exists = connection.execute(
                "SELECT 1 FROM news_items WHERE id = ?",
                (item["id"],),
            ).fetchone()
            if exists:
                continue

            connection.execute(
                """
                INSERT INTO news_items (
                    id, title, summary, source, published_at, importance,
                    analysis_status, event_type, countries, positive_industries,
                    negative_industries, related_symbols, ai_summary,
                    counter_arguments, analyzed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    item["title"],
                    item["summary"],
                    item["source"],
                    item["published_at"],
                    item["importance"],
                    item["analysis_status"],
                    item["event_type"],
                    json.dumps(item["countries"]),
                    json.dumps(item["positive_industries"]),
                    json.dumps(item["negative_industries"]),
                    json.dumps(item["related_symbols"]),
                    item["ai_summary"],
                    json.dumps(item["counter_arguments"]),
                    item.get("analyzed_at"),
                ),
            )
            inserted_count += 1

        total_count = connection.execute(
            "SELECT COUNT(*) FROM news_items"
        ).fetchone()[0]

    return {"inserted_count": inserted_count, "total_count": total_count}


def generate_dashboard_briefing() -> dict:
    news_items = get_news_list()[:8]
    now = datetime.now(timezone.utc).isoformat()

    positive_scores: dict[str, int] = {}
    risk_scores: dict[str, int] = {}
    for item in news_items:
        for industry in item["positive_industries"]:
            positive_scores[industry] = positive_scores.get(industry, 0) + 1
        for industry in item["negative_industries"]:
            risk_scores[industry] = risk_scores.get(industry, 0) + 1

    positive_industries = [
        industry
        for industry, _ in sorted(
            positive_scores.items(), key=lambda pair: (-pair[1], pair[0])
        )[:3]
    ] or ["Semiconductor"]
    risk_industries = [
        industry
        for industry, _ in sorted(
            risk_scores.items(), key=lambda pair: (-pair[1], pair[0])
        )[:3]
    ] or ["Logistics"]

    briefing_summary = (
        f"Top theme: {positive_industries[0]} remains the lead watch. "
        f"Main risk bucket: {risk_industries[0]}. "
        f"Processed {len(news_items)} recent articles for the current briefing."
    )

    with get_connection() as connection:
        current = get_dashboard_state_row()
        connection.execute(
            """
            UPDATE dashboard_state
            SET date = ?, last_analysis_at = ?, positive_industries = ?,
                risk_industries = ?, market_status = ?, briefing_summary = ?
            WHERE id = 1
            """,
            (
                now[:10],
                now,
                json.dumps(positive_industries),
                json.dumps(risk_industries),
                current["market_status"],
                briefing_summary,
            ),
        )

    return get_dashboard_payload()
