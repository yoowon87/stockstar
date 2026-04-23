from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db import get_connection
from app.services.stock_data import fetch_stock_quotes


VALID_BUCKETS = ("core", "edge", "satellite")
BUCKET_LABELS = {"core": "Core", "edge": "Edge", "satellite": "Satellite"}
BUCKET_TARGETS = {"core": 65.0, "edge": 28.0, "satellite": 7.0}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_holding(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "bucket": row["bucket"],
        "symbol": row["symbol"],
        "label": row["label"],
        "shares": row["shares"],
        "avg_price": row["avg_price"],
        "note": row["note"],
        "added_at": row["added_at"],
        "updated_at": row["updated_at"],
    }


def list_holdings() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM portfolio_holdings ORDER BY bucket ASC, added_at ASC"
        ).fetchall()
    return [_row_to_holding(r) for r in rows]


def get_holding(hid: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM portfolio_holdings WHERE id = ?", (hid,)).fetchone()
    return _row_to_holding(row) if row else None


def create_holding(payload: dict[str, Any]) -> dict[str, Any]:
    bucket = payload["bucket"]
    if bucket not in VALID_BUCKETS:
        raise ValueError(f"invalid bucket: {bucket}")
    if payload["shares"] <= 0 or payload["avg_price"] < 0:
        raise ValueError("shares must be > 0, avg_price must be >= 0")
    now = _now_iso()
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO portfolio_holdings (
                   bucket, symbol, label, shares, avg_price, note, added_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""",
            (
                bucket,
                payload["symbol"].strip(),
                payload.get("label", "").strip(),
                payload["shares"],
                payload["avg_price"],
                payload.get("note", ""),
                now,
                now,
            ),
        )
        hid = cur.fetchone()["id"]
    result = get_holding(hid)
    assert result is not None
    return result


def update_holding(hid: int, patch: dict[str, Any]) -> dict[str, Any]:
    existing = get_holding(hid)
    if existing is None:
        raise KeyError(f"holding {hid} not found")
    if "bucket" in patch and patch["bucket"] is not None and patch["bucket"] not in VALID_BUCKETS:
        raise ValueError(f"invalid bucket: {patch['bucket']}")

    fields: list[str] = []
    values: list[Any] = []
    for key in ("bucket", "label", "shares", "avg_price", "note"):
        if key in patch and patch[key] is not None:
            fields.append(f"{key} = ?")
            values.append(patch[key])
    if not fields:
        return existing
    fields.append("updated_at = ?")
    values.append(_now_iso())
    values.append(hid)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE portfolio_holdings SET {', '.join(fields)} WHERE id = ?",
            tuple(values),
        )
    result = get_holding(hid)
    assert result is not None
    return result


def delete_holding(hid: int) -> None:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM portfolio_holdings WHERE id = ?", (hid,))
        if cur.rowcount == 0:
            raise KeyError(f"holding {hid} not found")


def get_summary() -> dict[str, Any]:
    holdings = list_holdings()
    symbols = sorted({h["symbol"] for h in holdings if h["symbol"]})
    quotes: dict[str, Any] = fetch_stock_quotes(symbols) if symbols else {}

    enriched: list[dict[str, Any]] = []
    bucket_totals: dict[str, dict[str, float]] = {
        b: {"value": 0.0, "cost": 0.0} for b in VALID_BUCKETS
    }
    for h in holdings:
        q = quotes.get(h["symbol"], {}) or {}
        current_price = q.get("price") if isinstance(q.get("price"), (int, float)) else None
        cost = float(h["shares"]) * float(h["avg_price"])
        reference_price = current_price if current_price is not None else float(h["avg_price"])
        value = float(h["shares"]) * reference_price
        pnl = value - cost
        pnl_pct = (pnl / cost * 100.0) if cost else 0.0
        enriched.append(
            {
                "id": h["id"],
                "bucket": h["bucket"],
                "symbol": h["symbol"],
                "label": h["label"],
                "shares": h["shares"],
                "avg_price": h["avg_price"],
                "current_price": current_price,
                "cost": cost,
                "value": value,
                "pnl": pnl,
                "pnl_pct": pnl_pct,
                "share_of_total_pct": 0.0,
                "share_of_bucket_pct": 0.0,
                "note": h["note"],
            }
        )
        if h["bucket"] in bucket_totals:
            bucket_totals[h["bucket"]]["value"] += value
            bucket_totals[h["bucket"]]["cost"] += cost

    total_value = sum(bt["value"] for bt in bucket_totals.values())
    total_cost = sum(bt["cost"] for bt in bucket_totals.values())

    for h in enriched:
        bv = bucket_totals.get(h["bucket"], {}).get("value", 0.0)
        h["share_of_total_pct"] = (h["value"] / total_value * 100.0) if total_value else 0.0
        h["share_of_bucket_pct"] = (h["value"] / bv * 100.0) if bv else 0.0

    buckets: list[dict[str, Any]] = []
    for code in VALID_BUCKETS:
        bv = bucket_totals[code]["value"]
        bc = bucket_totals[code]["cost"]
        buckets.append(
            {
                "code": code,
                "label": BUCKET_LABELS[code],
                "target_pct": BUCKET_TARGETS[code],
                "actual_pct": (bv / total_value * 100.0) if total_value else 0.0,
                "cost": bc,
                "value": bv,
                "pnl": bv - bc,
                "pnl_pct": ((bv - bc) / bc * 100.0) if bc else 0.0,
                "holdings": [h for h in enriched if h["bucket"] == code],
            }
        )

    warnings: list[dict[str, Any]] = []
    # Rule 1: Edge single stock > 10% of total
    for h in enriched:
        if h["bucket"] == "edge" and h["share_of_total_pct"] > 10.0:
            warnings.append(
                {
                    "level": "warn",
                    "code": "edge_single_10pct",
                    "message": (
                        f"Edge 종목 '{h['label'] or h['symbol']}' 비중 "
                        f"{h['share_of_total_pct']:.1f}% — 전체 10% 초과 금지"
                    ),
                }
            )
    # Rule 2: Stop-loss band
    for h in enriched:
        if h["pnl_pct"] <= -20.0:
            warnings.append(
                {
                    "level": "error",
                    "code": "stop_loss_hard",
                    "message": (
                        f"'{h['label'] or h['symbol']}' 손실 {h['pnl_pct']:.1f}% — "
                        f"손절선 -20% 초과"
                    ),
                }
            )
        elif h["pnl_pct"] <= -15.0:
            warnings.append(
                {
                    "level": "warn",
                    "code": "stop_loss_soft",
                    "message": (
                        f"'{h['label'] or h['symbol']}' 손실 {h['pnl_pct']:.1f}% — "
                        f"손절선(-15~-20%) 진입"
                    ),
                }
            )
    # Rule 3: Bucket drift
    for b in buckets:
        drift = b["actual_pct"] - b["target_pct"]
        if total_value > 0 and abs(drift) > 5.0:
            warnings.append(
                {
                    "level": "info",
                    "code": "bucket_drift",
                    "message": (
                        f"{b['label']} 비중 {b['actual_pct']:.1f}% "
                        f"(목표 {b['target_pct']:.0f}%, 편차 {drift:+.1f}%p)"
                    ),
                }
            )

    return {
        "as_of": _now_iso(),
        "total_cost": total_cost,
        "total_value": total_value,
        "total_pnl": total_value - total_cost,
        "total_pnl_pct": ((total_value - total_cost) / total_cost * 100.0) if total_cost else 0.0,
        "buckets": buckets,
        "warnings": warnings,
    }
