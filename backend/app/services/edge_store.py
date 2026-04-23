from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


VALID_DECISIONS = ("pending", "buy", "watch", "pass")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_research(row) -> dict[str, Any]:
    return {
        "symbol": row["symbol"],
        "label": row["label"],
        "sector": row["sector"],
        "checklist": json.loads(row["checklist"]) if row["checklist"] else {},
        "checklist_notes": json.loads(row["checklist_notes"]) if row["checklist_notes"] else {},
        "q1_answer": row["q1_answer"],
        "q2_answer": row["q2_answer"],
        "q3_answer": row["q3_answer"],
        "decision": row["decision"],
        "decision_note": row["decision_note"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def list_research() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM edge_research ORDER BY updated_at DESC"
        ).fetchall()
    return [_row_to_research(r) for r in rows]


def get_research(symbol: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM edge_research WHERE symbol = ?", (symbol,)
        ).fetchone()
    return _row_to_research(row) if row else None


def upsert_research(payload: dict[str, Any]) -> dict[str, Any]:
    symbol = payload["symbol"].strip()
    if not symbol:
        raise ValueError("symbol is required")
    decision = payload.get("decision", "pending")
    if decision not in VALID_DECISIONS:
        raise ValueError(f"invalid decision: {decision}")
    now = _now_iso()
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT symbol FROM edge_research WHERE symbol = ?", (symbol,)
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE edge_research SET
                       label = ?,
                       sector = ?,
                       checklist = ?,
                       checklist_notes = ?,
                       q1_answer = ?,
                       q2_answer = ?,
                       q3_answer = ?,
                       decision = ?,
                       decision_note = ?,
                       updated_at = ?
                   WHERE symbol = ?""",
                (
                    payload.get("label", ""),
                    payload.get("sector", ""),
                    json.dumps(payload.get("checklist", {})),
                    json.dumps(payload.get("checklist_notes", {})),
                    payload.get("q1_answer", ""),
                    payload.get("q2_answer", ""),
                    payload.get("q3_answer", ""),
                    decision,
                    payload.get("decision_note", ""),
                    now,
                    symbol,
                ),
            )
        else:
            conn.execute(
                """INSERT INTO edge_research (
                       symbol, label, sector,
                       checklist, checklist_notes,
                       q1_answer, q2_answer, q3_answer,
                       decision, decision_note,
                       created_at, updated_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    symbol,
                    payload.get("label", ""),
                    payload.get("sector", ""),
                    json.dumps(payload.get("checklist", {})),
                    json.dumps(payload.get("checklist_notes", {})),
                    payload.get("q1_answer", ""),
                    payload.get("q2_answer", ""),
                    payload.get("q3_answer", ""),
                    decision,
                    payload.get("decision_note", ""),
                    now,
                    now,
                ),
            )
    result = get_research(symbol)
    assert result is not None
    return result


def delete_research(symbol: str) -> None:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM edge_research WHERE symbol = ?", (symbol,))
        if cur.rowcount == 0:
            raise KeyError(f"research {symbol} not found")
