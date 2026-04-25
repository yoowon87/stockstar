"""Theme score calculation per ver3 spec section 3.1.

Inputs are dicts coming from kis_client.fetch_quote (price, change_pct,
volume, trade_amount). Output is the score components used by the radar
and the daily snapshot.
"""
from __future__ import annotations

from typing import Any


# Normalization constants (ver3 §3.1)
AMOUNT_NORM_DENOM = 500_000_000_000  # 5천억 KRW => 1.0
CHANGE_NORM_DENOM = 5.0              # ±5% => ±1.0

# Triple-confirm thresholds
MIN_RISING_RATIO = 0.6               # 60%+ stocks rising
MIN_AVG_CHANGE = 1.5                 # avg +1.5%+
MIN_TOTAL_AMOUNT = 100_000_000_000   # 1천억 KRW

# Score weights
W_AMOUNT = 0.5
W_CHANGE = 0.3
W_RISING = 0.2

RISING_THRESHOLD_PCT = 1.0           # stock counts as "rising" if >+1.0%


def calculate_theme_score(stock_data: list[dict[str, Any]]) -> dict[str, Any]:
    """Return dict with score components for one theme.

    `stock_data`: list of {code, name?, price, change_pct, volume, trade_amount}.
    """
    if not stock_data:
        return _empty_score()

    total_amount = sum(int(s.get("trade_amount") or 0) for s in stock_data)
    amount_norm = min(total_amount / AMOUNT_NORM_DENOM, 1.0)

    avg_change = sum(float(s.get("change_pct") or 0) for s in stock_data) / len(stock_data)
    change_norm = max(min(avg_change / CHANGE_NORM_DENOM, 1.0), -1.0)

    rising = sum(1 for s in stock_data if float(s.get("change_pct") or 0) > RISING_THRESHOLD_PCT)
    rising_ratio = rising / len(stock_data)

    is_score_confirmed = (
        rising_ratio >= MIN_RISING_RATIO
        and avg_change >= MIN_AVG_CHANGE
        and total_amount >= MIN_TOTAL_AMOUNT
    )

    score = (
        amount_norm * W_AMOUNT
        + max(change_norm, 0) * W_CHANGE
        + rising_ratio * W_RISING
    )

    leader = max(stock_data, key=lambda s: int(s.get("trade_amount") or 0))

    rising_stocks = [
        {
            "code": s.get("code"),
            "name": s.get("name", ""),
            "change": round(float(s.get("change_pct") or 0), 2),
            "trade_amount": int(s.get("trade_amount") or 0),
        }
        for s in sorted(stock_data, key=lambda s: float(s.get("change_pct") or 0), reverse=True)
        if float(s.get("change_pct") or 0) > 0
    ]

    return {
        "total_amount": total_amount,
        "avg_change": round(avg_change, 2),
        "rising_ratio": round(rising_ratio, 3),
        "score": round(score, 3),
        "is_score_confirmed": is_score_confirmed,
        "leader_code": leader.get("code"),
        "leader_name": leader.get("name", ""),
        "leader_change": round(float(leader.get("change_pct") or 0), 2),
        "rising_stocks": rising_stocks,
    }


def is_triple_confirmed(score_result: dict[str, Any], news_count_24h: int) -> bool:
    """Triple confirm = score-confirmed AND at least one matching news in 24h."""
    return bool(score_result.get("is_score_confirmed")) and news_count_24h >= 1


def _empty_score() -> dict[str, Any]:
    return {
        "total_amount": 0,
        "avg_change": 0.0,
        "rising_ratio": 0.0,
        "score": 0.0,
        "is_score_confirmed": False,
        "leader_code": None,
        "leader_name": "",
        "leader_change": 0.0,
        "rising_stocks": [],
    }
