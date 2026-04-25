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
DAILY_CHART_TR_ID = "FHKST03010100"
FINANCIAL_RATIO_TR_ID = "FHKST66430300"
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
    None on failure. Auto-retries once on KIS rate-limit (msg contains '초과').
    """
    tok = token or get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price"
    params = {"FID_COND_MRKT_DIV_CODE": "J", "FID_INPUT_ISCD": stock_code}

    def _call(token_to_use: str):
        return requests.get(url, headers=_quote_headers(token_to_use), params=params, timeout=8)

    try:
        res = _call(tok)
        if res.status_code == 401:
            tok = get_access_token(force_refresh=True)
            res = _call(tok)
        res.raise_for_status()
        data = res.json()
        if data.get("rt_cd") != "0":
            msg = data.get("msg1", "")
            if "초과" in msg or "한도" in msg:
                # KIS rate limit — back off and retry once
                time.sleep(0.4)
                res = _call(tok)
                res.raise_for_status()
                data = res.json()
                if data.get("rt_cd") != "0":
                    return None
            else:
                return None
        out = data.get("output", {})
        def _to_float(v):
            try:
                return float(v) if v not in (None, "", "0") else None
            except (TypeError, ValueError):
                return None

        return {
            "code": stock_code,
            "price": float(out.get("stck_prpr") or 0),
            "change_pct": float(out.get("prdy_ctrt") or 0),
            "volume": int(out.get("acml_vol") or 0),
            "trade_amount": int(out.get("acml_tr_pbmn") or 0),
            "market_cap": int(out.get("hts_avls") or 0) * 100_000_000,
            "per": _to_float(out.get("per")),
            "pbr": _to_float(out.get("pbr")),
            "eps": _to_float(out.get("eps")),
            "bps": _to_float(out.get("bps")),
        }
    except Exception:
        return None


def fetch_financial_ratio(stock_code: str, token: str | None = None) -> dict[str, Any] | None:
    """Fetch the most recent quarterly financial ratios (incl. ROE)."""
    tok = token or get_access_token()
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/finance/financial-ratio"
    headers = {**_quote_headers(tok), "tr_id": FINANCIAL_RATIO_TR_ID}
    params = {
        "FID_DIV_CLS_CODE": "0",  # consolidated
        "fid_cond_mrkt_div_code": "J",
        "fid_input_iscd": stock_code,
    }
    try:
        res = requests.get(url, headers=headers, params=params, timeout=8)
        if res.status_code == 401:
            tok = get_access_token(force_refresh=True)
            headers = {**_quote_headers(tok), "tr_id": FINANCIAL_RATIO_TR_ID}
            res = requests.get(url, headers=headers, params=params, timeout=8)
        res.raise_for_status()
        data = res.json()
        if data.get("rt_cd") != "0":
            return None
        output = data.get("output") or []
        if not output:
            return None
        latest = output[0]
        def _to_float(v):
            try:
                return float(v) if v not in (None, "", "0") else None
            except (TypeError, ValueError):
                return None
        return {
            "period": latest.get("stac_yymm"),
            "roe": _to_float(latest.get("roe_val")),
            "debt_ratio": _to_float(latest.get("lblt_rate")),
            "reserve_ratio": _to_float(latest.get("rsrv_rate")),
            "revenue_growth": _to_float(latest.get("grs")),
            "operating_income_growth": _to_float(latest.get("bsop_prfi_inrt")),
            "net_income_growth": _to_float(latest.get("ntin_inrt")),
        }
    except Exception:
        return None


def fetch_stock_summary(stock_code: str) -> dict[str, Any]:
    """Quote + financial ratio combined."""
    token = get_access_token()
    quote = fetch_quote(stock_code, token=token) or {}
    ratio = fetch_financial_ratio(stock_code, token=token) or {}
    return {
        "code": stock_code,
        "price": quote.get("price"),
        "change_pct": quote.get("change_pct"),
        "volume": quote.get("volume"),
        "trade_amount": quote.get("trade_amount"),
        "market_cap": quote.get("market_cap"),
        "per": quote.get("per"),
        "pbr": quote.get("pbr"),
        "eps": quote.get("eps"),
        "bps": quote.get("bps"),
        "roe": ratio.get("roe"),
        "debt_ratio": ratio.get("debt_ratio"),
        "ratio_period": ratio.get("period"),
    }


def fetch_daily_chart(
    stock_code: str,
    days: int = 60,
    token: str | None = None,
) -> dict[str, Any]:
    """Fetch domestic stock daily candles for the past `days` days.

    Returns dict with keys:
      - code, count, candles=[{date(YYYY-MM-DD), open, high, low, close, volume}, ...]
        sorted oldest -> newest.
    """
    tok = token or get_access_token()
    end_dt = datetime.now(timezone.utc) + timedelta(hours=9)  # KST
    # Pad start window for non-trading days.
    start_dt = end_dt - timedelta(days=int(days * 1.6) + 5)
    url = f"{KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
    headers = {**_quote_headers(tok), "tr_id": DAILY_CHART_TR_ID}
    params = {
        "FID_COND_MRKT_DIV_CODE": "J",
        "FID_INPUT_ISCD": stock_code,
        "FID_INPUT_DATE_1": start_dt.strftime("%Y%m%d"),
        "FID_INPUT_DATE_2": end_dt.strftime("%Y%m%d"),
        "FID_PERIOD_DIV_CODE": "D",
        "FID_ORG_ADJ_PRC": "0",
    }
    try:
        res = requests.get(url, headers=headers, params=params, timeout=10)
        if res.status_code == 401:
            tok = get_access_token(force_refresh=True)
            headers = {**_quote_headers(tok), "tr_id": DAILY_CHART_TR_ID}
            res = requests.get(url, headers=headers, params=params, timeout=10)
        res.raise_for_status()
        data = res.json()
        if data.get("rt_cd") != "0":
            return {"code": stock_code, "count": 0, "candles": [], "error": data.get("msg1")}
        rows = data.get("output2") or []
        candles = []
        for r in rows:
            d = r.get("stck_bsop_date")
            if not d or len(d) != 8:
                continue
            try:
                candles.append({
                    "date": f"{d[0:4]}-{d[4:6]}-{d[6:8]}",
                    "open": float(r.get("stck_oprc") or 0),
                    "high": float(r.get("stck_hgpr") or 0),
                    "low": float(r.get("stck_lwpr") or 0),
                    "close": float(r.get("stck_clpr") or 0),
                    "volume": int(r.get("acml_vol") or 0),
                })
            except (TypeError, ValueError):
                continue
        candles.sort(key=lambda c: c["date"])
        candles = candles[-days:]
        return {"code": stock_code, "count": len(candles), "candles": candles}
    except Exception as e:
        return {"code": stock_code, "count": 0, "candles": [], "error": str(e)[:200]}


def fetch_quotes(
    stock_codes: list[str],
    max_workers: int = 3,
) -> dict[str, dict[str, Any]]:
    """Fetch quotes for many stocks in parallel.

    KIS personal API caps at ~20 req/sec but enforces it strictly per moment.
    Empirically 5 concurrent workers still hits '초당 거래건수 초과' on ~30%
    of calls. 3 workers + per-call retry-on-rate-limit gives near-zero misses
    and finishes ~150 codes in roughly 30s (well inside Vercel 60s budget).
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
