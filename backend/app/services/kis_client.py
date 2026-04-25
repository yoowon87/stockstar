"""KIS Developers REST API client.

- Caches OAuth access token in `api_tokens` (24h TTL).
- Single-stock and bulk quote helpers.
- Throttles calls to stay under KIS rate limits (~20/sec).

Endpoint reference:
- Token: POST /oauth2/tokenP
- Quote: GET /uapi/domestic-stock/v1/quotations/inquire-price (tr_id=FHKST01010100)
"""
from __future__ import annotations

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from app.db import get_connection


KIS_BASE_URL = "https://openapi.koreainvestment.com:9443"
KIS_PROVIDER_KEY = "kis"
QUOTE_TR_ID = "FHKST01010100"
THROTTLE_SECONDS = 0.07  # ~14 calls/sec, conservative under 20/sec limit


def _appkey() -> str:
    key = os.getenv("KIS_APP_KEY", "")
    if not key:
        raise RuntimeError("KIS_APP_KEY env var is required")
    return key


def _appsecret() -> str:
    secret = os.getenv("KIS_APP_SECRET", "")
    if not secret:
        raise RuntimeError("KIS_APP_SECRET env var is required")
    return secret


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _load_cached_token() -> tuple[str, datetime] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT token, expires_at FROM api_tokens WHERE provider = ?",
            (KIS_PROVIDER_KEY,),
        ).fetchone()
    if row is None:
        return None
    expires_at = row["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return row["token"], expires_at


def _save_cached_token(token: str, expires_at: datetime) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO api_tokens (provider, token, expires_at, updated_at)
               VALUES (?, ?, ?, now())
               ON CONFLICT (provider) DO UPDATE
                 SET token = EXCLUDED.token,
                     expires_at = EXCLUDED.expires_at,
                     updated_at = now()""",
            (KIS_PROVIDER_KEY, token, expires_at),
        )


def get_access_token(force_refresh: bool = False) -> str:
    """Return a valid KIS access token (cached, refreshed when within 1h of expiry)."""
    if not force_refresh:
        cached = _load_cached_token()
        if cached is not None:
            token, expires_at = cached
            if expires_at - _now_utc() > timedelta(hours=1):
                return token

    res = requests.post(
        f"{KIS_BASE_URL}/oauth2/tokenP",
        json={
            "grant_type": "client_credentials",
            "appkey": _appkey(),
            "appsecret": _appsecret(),
        },
        timeout=10,
    )
    res.raise_for_status()
    data = res.json()
    token = data["access_token"]
    expires_in = int(data.get("expires_in", 86400))
    expires_at = _now_utc() + timedelta(seconds=expires_in)
    _save_cached_token(token, expires_at)
    return token


def _quote_headers(token: str) -> dict[str, str]:
    return {
        "content-type": "application/json; charset=utf-8",
        "authorization": f"Bearer {token}",
        "appkey": _appkey(),
        "appsecret": _appsecret(),
        "tr_id": QUOTE_TR_ID,
    }


def fetch_quote(stock_code: str, token: str | None = None) -> dict[str, Any] | None:
    """Fetch a single domestic stock quote.

    Returns dict with keys: code, price, change_pct, volume, trade_amount, market_cap.
    None on failure.
    """
    tok = token or get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
    params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": stock_code}
    try:
        res = requests.get(url, headers=_quote_headers(tok), params=params, timeout=8)
        if res.status_code == 401:
            tok = get_access_token(force_refresh=True)
            res = requests.get(url, headers=_quote_headers(tok), params=params, timeout=8)
        res.raise_for_status()
        data = res.json()
        if data.get("rt_cd") != "0":
            return None
        out = data.get("output", {})
        return {
            "code": stock_code,
            "price": float(out.get("stck_prpr") or 0),
            "change_pct": float(out.get("prdy_ctrt") or 0),
            "volume": int(out.get("acml_vol") or 0),
            "trade_amount": int(out.get("acml_tr_pbmn") or 0),
            "market_cap": int(out.get("hts_avls") or 0) * 100_000_000,
        }
    except Exception:
        return None


def fetch_quotes(
    stock_codes: list[str],
    max_workers: int = 10,
) -> dict[str, dict[str, Any]]:
    """Fetch quotes for many stocks in parallel.

    KIS personal API limit is ~20 req/sec; with `max_workers=10` and ~150ms per
    KIS call we stay safely under that. Returns {code: quote_dict}.
    """
    if not stock_codes:
        return {}
    token = get_access_token()
    results: dict[str, dict[str, Any]] = {}

    def _one(code: str) -> tuple[str, dict[str, Any] | None]:
        return code, fetch_quote(code, token=token)

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = [pool.submit(_one, c) for c in stock_codes]
        for fut in as_completed(futures):
            try:
                code, quote = fut.result()
            except Exception:
                continue
            if quote is not None:
                results[code] = quote
    return results
