from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


VALID_ACTIONS = ("buy", "add", "sell", "trim", "watch")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_trade(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "date": row["date"],
        "symbol": row["symbol"],
        "label": row["label"],
        "action": row["action"],
        "reason": row["reason"],
        "emotion": row["emotion"],
        "lesson": row["lesson"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_trades(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM trade_logs ORDER BY date DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [_row_to_trade(r) for r in rows]


def get_trade(tid: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM trade_logs WHERE id = ?", (tid,)).fetchone()
    return _row_to_trade(row) if row else None


def create_trade(payload: dict[str, Any]) -> dict[str, Any]:
    action = payload["action"]
    if action not in VALID_ACTIONS:
        raise ValueError(f"invalid action: {action}")
    if not payload.get("date", "").strip():
        raise ValueError("date is required")
    now = _now_iso()
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO trade_logs (
                   date, symbol, label, action, reason, emotion, lesson,
                   created_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""",
            (
                payload["date"].strip(),
                payload.get("symbol", "").strip(),
                payload.get("label", "").strip(),
                action,
                payload.get("reason", ""),
                payload.get("emotion", ""),
                payload.get("lesson", ""),
                now,
                now,
            ),
        )
        tid = cur.fetchone()["id"]
    result = get_trade(tid)
    assert result is not None
    return result


def update_trade(tid: int, patch: dict[str, Any]) -> dict[str, Any]:
    existing = get_trade(tid)
    if existing is None:
        raise KeyError(f"trade {tid} not found")
    if "action" in patch and patch["action"] is not None and patch["action"] not in VALID_ACTIONS:
        raise ValueError(f"invalid action: {patch['action']}")

    fields: list[str] = []
    values: list[Any] = []
    for key in ("date", "symbol", "label", "action", "reason", "emotion", "lesson"):
        if key in patch and patch[key] is not None:
            fields.append(f"{key} = ?")
            values.append(patch[key])
    if not fields:
        return existing
    fields.append("updated_at = ?")
    values.append(_now_iso())
    values.append(tid)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE trade_logs SET {', '.join(fields)} WHERE id = ?",
            tuple(values),
        )
    result = get_trade(tid)
    assert result is not None
    return result


def delete_trade(tid: int) -> None:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM trade_logs WHERE id = ?", (tid,))
        if cur.rowcount == 0:
            raise KeyError(f"trade {tid} not found")
