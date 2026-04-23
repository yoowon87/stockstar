from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


VALID_SCOPES = ("weekly", "monthly", "quarterly")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_review(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "scope": row["scope"],
        "period_key": row["period_key"],
        "content": json.loads(row["content"]) if row["content"] else {},
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_reviews(scope: str | None = None, limit: int = 30) -> list[dict[str, Any]]:
    with get_connection() as conn:
        if scope:
            rows = conn.execute(
                "SELECT * FROM reviews WHERE scope = ? ORDER BY period_key DESC LIMIT ?",
                (scope, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM reviews ORDER BY period_key DESC LIMIT ?", (limit,)
            ).fetchall()
    return [_row_to_review(r) for r in rows]


def get_review(scope: str, period_key: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM reviews WHERE scope = ? AND period_key = ?", (scope, period_key)
        ).fetchone()
    return _row_to_review(row) if row else None


def upsert_review(scope: str, period_key: str, content: dict[str, str]) -> dict[str, Any]:
    if scope not in VALID_SCOPES:
        raise ValueError(f"invalid scope: {scope}")
    if not period_key.strip():
        raise ValueError("period_key is required")
    now = _now_iso()
    content_json = json.dumps(content)
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM reviews WHERE scope = ? AND period_key = ?", (scope, period_key)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE reviews SET content = ?, updated_at = ? WHERE id = ?",
                (content_json, now, existing["id"]),
            )
        else:
            conn.execute(
                """INSERT INTO reviews (scope, period_key, content, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (scope, period_key, content_json, now, now),
            )
    result = get_review(scope, period_key)
    assert result is not None
    return result


def delete_review(review_id: int) -> None:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
        if cur.rowcount == 0:
            raise KeyError(f"review {review_id} not found")
