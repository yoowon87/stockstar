from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_log(row) -> dict[str, Any]:
    return {
        "date": row["date"],
        "morning_done": bool(row["morning_done"]),
        "lunch_done": bool(row["lunch_done"]),
        "evening_done": bool(row["evening_done"]),
        "note": row["note"],
        "updated_at": row["updated_at"],
    }


def get_log(date: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM routine_logs WHERE date = ?", (date,)
        ).fetchone()
    return _row_to_log(row) if row else None


def upsert_log(date: str, payload: dict[str, Any]) -> dict[str, Any]:
    now = _now_iso()
    m = 1 if payload.get("morning_done") else 0
    l = 1 if payload.get("lunch_done") else 0
    e = 1 if payload.get("evening_done") else 0
    note = payload.get("note", "")
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT date FROM routine_logs WHERE date = ?", (date,)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE routine_logs SET
                       morning_done = ?, lunch_done = ?, evening_done = ?,
                       note = ?, updated_at = ?
                   WHERE date = ?""",
                (m, l, e, note, now, date),
            )
        else:
            conn.execute(
                """INSERT INTO routine_logs (
                       date, morning_done, lunch_done, evening_done, note, updated_at
                   ) VALUES (?, ?, ?, ?, ?, ?)""",
                (date, m, l, e, note, now),
            )
    result = get_log(date)
    assert result is not None
    return result


def default_log(date: str) -> dict[str, Any]:
    return {
        "date": date,
        "morning_done": False,
        "lunch_done": False,
        "evening_done": False,
        "note": "",
        "updated_at": "",
    }
