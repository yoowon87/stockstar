from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.db import get_connection
from app.services.stock_data import fetch_stock_quotes


VALID_VERDICTS = ("pending", "gem", "watch", "reject")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_analysis(row) -> dict[str, Any]:
    return {
        "symbol": row["symbol"],
        "label": row["label"],
        "sector": row["sector"],
        "business": row["business"],
        "financials": json.loads(row["financials"]) if row["financials"] else [],
        "per": row["per"],
        "pbr": row["pbr"],
        "debt_ratio": row["debt_ratio"],
        "chart_memo": row["chart_memo"],
        "chart_image": row["chart_image"],
        "has_chart_image": bool(row["chart_image"]),
        "memo": row["memo"],
        "verdict": row["verdict"],
        "current_price": None,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _enrich_prices(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fill current_price from live quotes (Portfolio-style). Failures stay None."""
    symbols = sorted({i["symbol"] for i in items if i["symbol"]})
    if not symbols:
        return items
    try:
        quotes = fetch_stock_quotes(symbols)
    except Exception:
        quotes = {}
    for i in items:
        q = quotes.get(i["symbol"], {}) or {}
        price = q.get("price")
        i["current_price"] = price if isinstance(price, (int, float)) else None
    return items


def list_analyses() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM stock_analyses ORDER BY updated_at DESC"
        ).fetchall()
    items = [_row_to_analysis(r) for r in rows]
    # Keep the list payload light — drop heavy base64 images (has_chart_image flag remains).
    for i in items:
        i["chart_image"] = ""
    return _enrich_prices(items)


def get_analysis(symbol: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM stock_analyses WHERE symbol = ?", (symbol,)
        ).fetchone()
    if row is None:
        return None
    return _enrich_prices([_row_to_analysis(row)])[0]


def upsert_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    symbol = payload["symbol"].strip()
    if not symbol:
        raise ValueError("symbol is required")
    verdict = payload.get("verdict", "pending")
    if verdict not in VALID_VERDICTS:
        raise ValueError(f"invalid verdict: {verdict}")
    financials_json = json.dumps(payload.get("financials", []))
    now = _now_iso()
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT symbol FROM stock_analyses WHERE symbol = ?", (symbol,)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE stock_analyses SET
                       label = ?,
                       sector = ?,
                       business = ?,
                       financials = ?,
                       per = ?,
                       pbr = ?,
                       debt_ratio = ?,
                       chart_memo = ?,
                       chart_image = ?,
                       memo = ?,
                       verdict = ?,
                       updated_at = ?
                   WHERE symbol = ?""",
                (
                    payload.get("label", ""),
                    payload.get("sector", ""),
                    payload.get("business", ""),
                    financials_json,
                    payload.get("per"),
                    payload.get("pbr"),
                    payload.get("debt_ratio"),
                    payload.get("chart_memo", ""),
                    payload.get("chart_image", ""),
                    payload.get("memo", ""),
                    verdict,
                    now,
                    symbol,
                ),
            )
        else:
            conn.execute(
                """INSERT INTO stock_analyses (
                       symbol, label, sector, business, financials,
                       per, pbr, debt_ratio, chart_memo, chart_image, memo, verdict,
                       created_at, updated_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    symbol,
                    payload.get("label", ""),
                    payload.get("sector", ""),
                    payload.get("business", ""),
                    financials_json,
                    payload.get("per"),
                    payload.get("pbr"),
                    payload.get("debt_ratio"),
                    payload.get("chart_memo", ""),
                    payload.get("chart_image", ""),
                    payload.get("memo", ""),
                    verdict,
                    now,
                    now,
                ),
            )
    result = get_analysis(symbol)
    assert result is not None
    return result


def delete_analysis(symbol: str) -> None:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM stock_analyses WHERE symbol = ?", (symbol,))
        if cur.rowcount == 0:
            raise KeyError(f"analysis {symbol} not found")
