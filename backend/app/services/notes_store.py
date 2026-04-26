"""CRUD + filters + reverse-index for the News Vault notes."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


VALID_TYPES = ("news_analysis", "memo", "observation")
VALID_ROLES = ("beneficiary", "victim", "mention")
VALID_VERIFICATION = ("pending", "verified_hit", "verified_miss", "expired")


def _maybe_jsonb(value: Any):
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return None
    return value


def _row_to_note(row, *, with_collections: bool = False, tags: list[str] | None = None,
                 stocks: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    out = {
        "id": str(row["id"]),
        "type": row["type"],
        "title": row["title"],
        "content": row["content"] or "",
        "source_url": row["source_url"],
        "source_name": row["source_name"],
        "source_excerpt": row["source_excerpt"],
        "published_at": row["published_at"].isoformat() if row["published_at"] else None,
        "analysis_result": _maybe_jsonb(row["analysis_result"]),
        "action_window_start": row["action_window_start"].isoformat() if row["action_window_start"] else None,
        "action_window_until": row["action_window_until"].isoformat() if row["action_window_until"] else None,
        "verification_status": row["verification_status"],
        "verified_at": row["verified_at"].isoformat() if row["verified_at"] else None,
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }
    if with_collections:
        out["tags"] = tags or []
        out["stocks"] = stocks or []
    return out


def _fetch_tags(conn, note_id: str) -> list[str]:
    rows = conn.execute("SELECT tag FROM note_tags WHERE note_id = ? ORDER BY tag", (note_id,)).fetchall()
    return [r["tag"] for r in rows]


def _fetch_stocks(conn, note_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """SELECT stock_code, stock_name, role, confidence, rationale,
                  price_at_note, price_after_1d, price_after_7d, price_after_30d
             FROM note_stocks
            WHERE note_id = ?
            ORDER BY confidence DESC NULLS LAST, stock_code""",
        (note_id,),
    ).fetchall()
    return [{
        "stock_code": r["stock_code"],
        "stock_name": r["stock_name"],
        "role": r["role"],
        "confidence": r["confidence"],
        "rationale": r["rationale"],
        "price_at_note": float(r["price_at_note"]) if r["price_at_note"] is not None else None,
        "price_after_1d": float(r["price_after_1d"]) if r["price_after_1d"] is not None else None,
        "price_after_7d": float(r["price_after_7d"]) if r["price_after_7d"] is not None else None,
        "price_after_30d": float(r["price_after_30d"]) if r["price_after_30d"] is not None else None,
    } for r in rows]


# ───────── CRUD ─────────

def create_note(payload: dict[str, Any]) -> dict[str, Any]:
    if payload["type"] not in VALID_TYPES:
        raise ValueError(f"invalid type: {payload['type']}")
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO notes (
                   type, title, content,
                   source_url, source_name, source_excerpt, published_at,
                   analysis_result, action_window_start, action_window_until
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?)
               RETURNING id""",
            (
                payload["type"],
                payload["title"],
                payload.get("content", ""),
                payload.get("source_url"),
                payload.get("source_name"),
                payload.get("source_excerpt"),
                payload.get("published_at"),
                json.dumps(payload["analysis_result"]) if payload.get("analysis_result") else None,
                payload.get("action_window_start"),
                payload.get("action_window_until"),
            ),
        )
        nid = str(cur.fetchone()["id"])
        for tag in (payload.get("tags") or []):
            tag = tag.strip()
            if not tag:
                continue
            conn.execute(
                "INSERT INTO note_tags (note_id, tag) VALUES (?, ?) ON CONFLICT DO NOTHING",
                (nid, tag),
            )
        for s in (payload.get("stocks") or []):
            if not s.get("stock_code") or not s.get("stock_name"):
                continue
            role = s.get("role", "mention")
            if role not in VALID_ROLES:
                role = "mention"
            conn.execute(
                """INSERT INTO note_stocks (
                       note_id, stock_code, stock_name, role,
                       confidence, rationale, price_at_note
                   ) VALUES (?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (note_id, stock_code) DO UPDATE SET
                       stock_name = EXCLUDED.stock_name,
                       role = EXCLUDED.role,
                       confidence = EXCLUDED.confidence,
                       rationale = EXCLUDED.rationale""",
                (
                    nid,
                    s["stock_code"],
                    s["stock_name"],
                    role,
                    s.get("confidence"),
                    s.get("rationale"),
                    s.get("price_at_note"),
                ),
            )
    result = get_note(nid)
    assert result is not None
    return result


def get_note(note_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        if row is None:
            return None
        tags = _fetch_tags(conn, note_id)
        stocks = _fetch_stocks(conn, note_id)
    return _row_to_note(row, with_collections=True, tags=tags, stocks=stocks)


def list_notes(
    *,
    q: str | None = None,
    tag: str | None = None,
    stock_code: str | None = None,
    type_: str | None = None,
    verification: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Return notes with light tag/stock previews per row."""
    where: list[str] = []
    params: list[Any] = []
    if type_:
        where.append("n.type = %s")
        params.append(type_)
    if verification:
        where.append("n.verification_status = %s")
        params.append(verification)
    if q:
        where.append("(n.title ILIKE %s OR n.content ILIKE %s OR n.source_excerpt ILIKE %s)")
        like = f"%{q}%"
        params.extend([like, like, like])
    if tag:
        where.append("n.id IN (SELECT note_id FROM note_tags WHERE tag = %s)")
        params.append(tag)
    if stock_code:
        where.append("n.id IN (SELECT note_id FROM note_stocks WHERE stock_code = %s)")
        params.append(stock_code)

    sql = "SELECT n.* FROM notes n"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY n.created_at DESC LIMIT %s"
    params.append(limit)

    with get_connection() as conn:
        rows = conn.execute(sql, tuple(params)).fetchall()
        notes = []
        for r in rows:
            nid = str(r["id"])
            tags = _fetch_tags(conn, nid)
            stocks = _fetch_stocks(conn, nid)
            notes.append(_row_to_note(r, with_collections=True, tags=tags, stocks=stocks))
    return notes


def update_note(note_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    fields: list[str] = []
    values: list[Any] = []
    for key in ("type", "title", "content", "source_url", "source_name",
                "source_excerpt", "published_at", "action_window_start",
                "action_window_until", "verification_status"):
        if key in patch and patch[key] is not None:
            fields.append(f"{key} = %s")
            values.append(patch[key])
    if "analysis_result" in patch:
        fields.append("analysis_result = %s::jsonb")
        values.append(json.dumps(patch["analysis_result"]) if patch["analysis_result"] else None)
    fields.append("updated_at = now()")
    if not fields:
        return get_note(note_id)
    values.append(note_id)
    with get_connection() as conn:
        conn.execute(f"UPDATE notes SET {', '.join(fields)} WHERE id = %s", tuple(values))
        if "tags" in patch:
            conn.execute("DELETE FROM note_tags WHERE note_id = ?", (note_id,))
            for tag in (patch["tags"] or []):
                tag = tag.strip()
                if tag:
                    conn.execute(
                        "INSERT INTO note_tags (note_id, tag) VALUES (?, ?) ON CONFLICT DO NOTHING",
                        (note_id, tag),
                    )
        if "stocks" in patch:
            conn.execute("DELETE FROM note_stocks WHERE note_id = ?", (note_id,))
            for s in (patch["stocks"] or []):
                if not s.get("stock_code") or not s.get("stock_name"):
                    continue
                role = s.get("role", "mention")
                if role not in VALID_ROLES:
                    role = "mention"
                conn.execute(
                    """INSERT INTO note_stocks (
                           note_id, stock_code, stock_name, role,
                           confidence, rationale, price_at_note
                       ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        note_id,
                        s["stock_code"],
                        s["stock_name"],
                        role,
                        s.get("confidence"),
                        s.get("rationale"),
                        s.get("price_at_note"),
                    ),
                )
    return get_note(note_id)


def delete_note(note_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        return cur.rowcount > 0


# ───────── Reverse index ─────────

def notes_for_stock(stock_code: str, limit: int = 30) -> list[dict[str, Any]]:
    """Stocks page can show 'this code mentioned in these notes'."""
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT n.*, ns.role, ns.confidence,
                      ns.price_at_note, ns.price_after_7d
                 FROM note_stocks ns
                 JOIN notes n ON n.id = ns.note_id
                WHERE ns.stock_code = ?
                ORDER BY n.created_at DESC
                LIMIT ?""",
            (stock_code, limit),
        ).fetchall()
    out = []
    for r in rows:
        pct_7d = None
        if r["price_at_note"] and r["price_after_7d"]:
            pct_7d = round((float(r["price_after_7d"]) / float(r["price_at_note"]) - 1) * 100, 2)
        out.append({
            "id": str(r["id"]),
            "title": r["title"],
            "type": r["type"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "verification_status": r["verification_status"],
            "role": r["role"],
            "confidence": r["confidence"],
            "pct_7d": pct_7d,
        })
    return out


# ───────── Tag suggestions ─────────

def all_tags(limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT tag, COUNT(*) AS c FROM note_tags GROUP BY tag ORDER BY c DESC, tag LIMIT ?",
            (limit,),
        ).fetchall()
    return [{"tag": r["tag"], "count": r["c"]} for r in rows]


# ───────── Price tracking (cron) ─────────

def stock_codes_needing_update(window: str) -> list[tuple[str, str]]:
    """Return [(note_id, stock_code), ...] whose `price_after_{window}` is null
    AND the note is at least N days old."""
    days = {"1d": 1, "7d": 7, "30d": 30}[window]
    col = f"price_after_{window}"
    with get_connection() as conn:
        rows = conn.execute(
            f"""SELECT ns.note_id, ns.stock_code
                  FROM note_stocks ns
                  JOIN notes n ON n.id = ns.note_id
                 WHERE ns.{col} IS NULL
                   AND n.created_at < (now() - (%s || ' days')::interval)""",
            (str(days),),
        ).fetchall()
    return [(str(r["note_id"]), r["stock_code"]) for r in rows]


def write_price_update(note_id: str, stock_code: str, window: str, price: float) -> None:
    col = f"price_after_{window}"
    with get_connection() as conn:
        conn.execute(
            f"UPDATE note_stocks SET {col} = ? WHERE note_id = ? AND stock_code = ?",
            (price, note_id, stock_code),
        )


def auto_verify(note_id: str) -> None:
    """If a note has a 7d price set on its highest-confidence stock, flip
    pending -> verified_hit/miss based on the sign."""
    with get_connection() as conn:
        n = conn.execute(
            "SELECT verification_status, action_window_until FROM notes WHERE id = ?",
            (note_id,),
        ).fetchone()
        if n is None or n["verification_status"] != "pending":
            return
        # Expired? (action window passed without verification)
        if n["action_window_until"] is not None:
            cur = conn.execute(
                "SELECT (now() > ?) AS expired", (n["action_window_until"],)
            ).fetchone()
            if cur["expired"]:
                conn.execute(
                    "UPDATE notes SET verification_status='expired', verified_at=now() WHERE id=?",
                    (note_id,),
                )
                return
        row = conn.execute(
            """SELECT price_at_note, price_after_7d
                 FROM note_stocks
                WHERE note_id = ?
                  AND confidence IS NOT NULL
                ORDER BY confidence DESC NULLS LAST
                LIMIT 1""",
            (note_id,),
        ).fetchone()
        if row is None or row["price_at_note"] is None or row["price_after_7d"] is None:
            return
        ret = float(row["price_after_7d"]) / float(row["price_at_note"]) - 1
        status = "verified_hit" if ret > 0 else "verified_miss"
        conn.execute(
            "UPDATE notes SET verification_status=?, verified_at=now() WHERE id=?",
            (status, note_id),
        )


# ───────── Daily Claude usage ─────────

def get_today_usage() -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM daily_api_usage WHERE date = current_date"
        ).fetchone()
    if row is None:
        return {"date": None, "haiku_calls": 0, "haiku_passed": 0, "sonnet_calls": 0, "cost_krw": 0.0}
    return {
        "date": row["date"].isoformat(),
        "haiku_calls": row["haiku_calls"] or 0,
        "haiku_passed": row["haiku_passed"] or 0,
        "sonnet_calls": row["sonnet_calls"] or 0,
        "cost_krw": float(row["cost_krw"] or 0),
    }


def bump_usage(*, haiku: int = 0, haiku_passed: int = 0, sonnet: int = 0, cost_krw: float = 0.0) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO daily_api_usage (date, haiku_calls, haiku_passed, sonnet_calls, cost_krw, updated_at)
               VALUES (current_date, ?, ?, ?, ?, now())
               ON CONFLICT (date) DO UPDATE SET
                 haiku_calls = daily_api_usage.haiku_calls + EXCLUDED.haiku_calls,
                 haiku_passed = daily_api_usage.haiku_passed + EXCLUDED.haiku_passed,
                 sonnet_calls = daily_api_usage.sonnet_calls + EXCLUDED.sonnet_calls,
                 cost_krw = daily_api_usage.cost_krw + EXCLUDED.cost_krw,
                 updated_at = now()""",
            (haiku, haiku_passed, sonnet, cost_krw),
        )
