from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db import get_connection


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_forecast(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "symbol": row["symbol"],
        "label": row["label"],
        "current_price": row["current_price"],
        "predicted_direction": row["predicted_direction"],
        "rationale": row["rationale"],
        "actual_direction": row["actual_direction"],
        "actual_pct": row["actual_pct"],
        "is_correct": None if row["is_correct"] is None else bool(row["is_correct"]),
    }


def _row_to_prediction(row, forecasts: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "date": row["date"],
        "market_temp": row["market_temp"],
        "today_thoughts": row["today_thoughts"],
        "news_observation": row["news_observation"],
        "kospi_current": row["kospi_current"],
        "kospi_forecast_1w": row["kospi_forecast_1w"],
        "kospi_rationale": row["kospi_rationale"],
        "kospi_counter_reason": row["kospi_counter_reason"],
        "emotion_state": row["emotion_state"],
        "impulse_note": row["impulse_note"],
        "verified_at": row["verified_at"],
        "lesson": row["lesson"],
        "created_at": row["created_at"],
        "stock_forecasts": forecasts,
    }


def get_prediction_by_id(pid: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM predictions WHERE id = ?", (pid,)).fetchone()
        if row is None:
            return None
        forecasts = conn.execute(
            "SELECT * FROM prediction_stock_forecasts WHERE prediction_id = ? ORDER BY id ASC",
            (pid,),
        ).fetchall()
    return _row_to_prediction(row, [_row_to_forecast(f) for f in forecasts])


def get_prediction_by_date(date: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM predictions WHERE date = ?", (date,)).fetchone()
    if row is None:
        return None
    return get_prediction_by_id(row["id"])


def list_predictions(limit: int = 30) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id FROM predictions ORDER BY date DESC LIMIT ?", (limit,)
        ).fetchall()
    results: list[dict[str, Any]] = []
    for r in rows:
        p = get_prediction_by_id(r["id"])
        if p is not None:
            results.append(p)
    return results


def upsert_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    date = payload["date"]
    now = _now_iso()
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id, verified_at FROM predictions WHERE date = ?", (date,)
        ).fetchone()
        if existing and existing["verified_at"]:
            raise ValueError("이미 검증된 예측은 수정할 수 없습니다.")
        if existing:
            pid = existing["id"]
            conn.execute(
                """UPDATE predictions SET
                       market_temp = ?,
                       today_thoughts = ?,
                       news_observation = ?,
                       kospi_current = ?,
                       kospi_forecast_1w = ?,
                       kospi_rationale = ?,
                       kospi_counter_reason = ?,
                       emotion_state = ?,
                       impulse_note = ?
                   WHERE id = ?""",
                (
                    payload["market_temp"],
                    payload.get("today_thoughts", ""),
                    payload.get("news_observation", ""),
                    payload.get("kospi_current"),
                    payload.get("kospi_forecast_1w"),
                    payload.get("kospi_rationale", ""),
                    payload.get("kospi_counter_reason", ""),
                    payload.get("emotion_state", ""),
                    payload.get("impulse_note", ""),
                    pid,
                ),
            )
            conn.execute(
                "DELETE FROM prediction_stock_forecasts WHERE prediction_id = ?", (pid,)
            )
        else:
            cur = conn.execute(
                """INSERT INTO predictions (
                       date, market_temp, today_thoughts, news_observation,
                       kospi_current, kospi_forecast_1w, kospi_rationale,
                       kospi_counter_reason, emotion_state, impulse_note, created_at
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id""",
                (
                    date,
                    payload["market_temp"],
                    payload.get("today_thoughts", ""),
                    payload.get("news_observation", ""),
                    payload.get("kospi_current"),
                    payload.get("kospi_forecast_1w"),
                    payload.get("kospi_rationale", ""),
                    payload.get("kospi_counter_reason", ""),
                    payload.get("emotion_state", ""),
                    payload.get("impulse_note", ""),
                    now,
                ),
            )
            pid = cur.fetchone()["id"]
        for f in payload.get("stock_forecasts", []):
            conn.execute(
                """INSERT INTO prediction_stock_forecasts (
                       prediction_id, symbol, label, current_price,
                       predicted_direction, rationale
                   ) VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    pid,
                    f["symbol"],
                    f.get("label", ""),
                    f.get("current_price"),
                    f["predicted_direction"],
                    f.get("rationale", ""),
                ),
            )
    result = get_prediction_by_id(pid)
    assert result is not None
    return result


def verify_prediction(
    pid: int,
    lesson: str,
    outcomes: list[dict[str, Any]],
) -> dict[str, Any]:
    now = _now_iso()
    with get_connection() as conn:
        row = conn.execute("SELECT id FROM predictions WHERE id = ?", (pid,)).fetchone()
        if row is None:
            raise KeyError(f"prediction {pid} not found")
        f_rows = conn.execute(
            "SELECT id, predicted_direction FROM prediction_stock_forecasts WHERE prediction_id = ?",
            (pid,),
        ).fetchall()
        direction_map = {r["id"]: r["predicted_direction"] for r in f_rows}
        for o in outcomes:
            fid = o["forecast_id"]
            if fid not in direction_map:
                continue
            actual = o["actual_direction"]
            is_correct = 1 if actual == direction_map[fid] else 0
            conn.execute(
                """UPDATE prediction_stock_forecasts
                       SET actual_direction = ?, actual_pct = ?, is_correct = ?
                   WHERE id = ?""",
                (actual, o.get("actual_pct"), is_correct, fid),
            )
        conn.execute(
            "UPDATE predictions SET verified_at = ?, lesson = ? WHERE id = ?",
            (now, lesson, pid),
        )
    result = get_prediction_by_id(pid)
    assert result is not None
    return result


def monthly_stats(month: str) -> dict[str, Any]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT f.predicted_direction, f.is_correct
                 FROM prediction_stock_forecasts f
                 JOIN predictions p ON p.id = f.prediction_id
                WHERE substr(p.date, 1, 7) = ?
                  AND p.verified_at IS NOT NULL""",
            (month,),
        ).fetchall()
        total_predictions = conn.execute(
            "SELECT COUNT(*) AS c FROM predictions WHERE substr(date, 1, 7) = ?",
            (month,),
        ).fetchone()["c"]

    total = len(rows)
    correct = sum(1 for r in rows if r["is_correct"] == 1)
    wrong = total - correct

    by_direction: dict[str, dict[str, Any]] = {
        "up": {"count": 0, "correct": 0, "pct": 0.0},
        "flat": {"count": 0, "correct": 0, "pct": 0.0},
        "down": {"count": 0, "correct": 0, "pct": 0.0},
    }
    for r in rows:
        d = r["predicted_direction"]
        if d not in by_direction:
            continue
        by_direction[d]["count"] += 1
        if r["is_correct"] == 1:
            by_direction[d]["correct"] += 1
    for v in by_direction.values():
        v["pct"] = round(100.0 * v["correct"] / v["count"], 1) if v["count"] else 0.0

    return {
        "month": month,
        "total_predictions": total_predictions,
        "total_stock_forecasts": total,
        "correct": correct,
        "wrong": wrong,
        "accuracy_pct": round(100.0 * correct / total, 1) if total else 0.0,
        "by_direction": by_direction,
    }
