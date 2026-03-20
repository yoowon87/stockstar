from __future__ import annotations
from typing import Dict, List, Any
import json
import requests


YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def _fetch_yahoo_chart(symbol, range_str="6mo", interval="1mo"):
    # type: (str, str, str) -> Dict[str, Any]
    """Fetch chart data from Yahoo Finance v8 API."""
    url = YAHOO_CHART_URL.format(symbol=symbol)
    params = {"range": range_str, "interval": interval, "includePrePost": "false"}
    resp = requests.get(url, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    result_data = data.get("chart", {}).get("result", [])
    if not result_data:
        return {}
    return result_data[0]


def fetch_stock_quotes(symbols):
    # type: (List[str]) -> Dict[str, Any]
    """Fetch current price data for a list of symbols."""
    result = {}
    for symbol in symbols:
        try:
            # Get 5-day data for current price + prev close
            short = _fetch_yahoo_chart(symbol, "5d", "1d")
            if not short:
                result[symbol] = {"symbol": symbol, "error": "No data"}
                continue

            meta = short.get("meta", {})
            closes = short.get("indicators", {}).get("quote", [{}])[0].get("close", [])
            volumes = short.get("indicators", {}).get("quote", [{}])[0].get("volume", [])
            timestamps = short.get("timestamp", [])

            # Filter out None values
            valid_closes = [(t, c, v) for t, c, v in zip(timestamps, closes, volumes or [0]*len(closes)) if c is not None]
            if not valid_closes:
                result[symbol] = {"symbol": symbol, "error": "No price data"}
                continue

            price = round(valid_closes[-1][1], 2)
            prev_close = round(valid_closes[-2][1], 2) if len(valid_closes) >= 2 else price
            change_pct = round(((price - prev_close) / prev_close * 100) if prev_close else 0, 2)
            volume = int(valid_closes[-1][2] or 0)

            currency = meta.get("currency", "USD")
            name = meta.get("shortName") or meta.get("symbol") or symbol

            # Get 6-month chart
            chart = []
            try:
                long_data = _fetch_yahoo_chart(symbol, "6mo", "1mo")
                if long_data:
                    long_closes = long_data.get("indicators", {}).get("quote", [{}])[0].get("close", [])
                    long_volumes = long_data.get("indicators", {}).get("quote", [{}])[0].get("volume", [])
                    long_ts = long_data.get("timestamp", [])
                    import datetime
                    for i, ts in enumerate(long_ts):
                        c = long_closes[i] if i < len(long_closes) else None
                        v = long_volumes[i] if long_volumes and i < len(long_volumes) else 0
                        if c is not None:
                            dt = datetime.datetime.utcfromtimestamp(ts)
                            chart.append({
                                "date": dt.strftime("%Y-%m"),
                                "close": round(c, 2),
                                "volume": int(v or 0),
                            })
            except Exception:
                pass

            result[symbol] = {
                "symbol": symbol,
                "name": name,
                "price": price,
                "prev_close": prev_close,
                "change_pct": change_pct,
                "market_cap": 0,
                "market_cap_label": "-",
                "volume": volume,
                "volume_label": _format_volume(volume),
                "currency": currency,
                "chart": chart,
            }
        except Exception as e:
            result[symbol] = {"symbol": symbol, "error": str(e)}
    return result


def fetch_market_indicators():
    # type: () -> List[Dict[str, str]]
    """Fetch major market indicators."""
    indicators = [
        ("^IXIC", "Nasdaq"),
        ("^GSPC", "S&P 500"),
        ("USDKRW=X", "USD/KRW"),
        ("CL=F", "WTI"),
        ("^TNX", "US 10Y"),
    ]
    result = []
    for symbol, label in indicators:
        try:
            data = _fetch_yahoo_chart(symbol, "5d", "1d")
            if not data:
                result.append({"label": label, "value": "-", "change": "-"})
                continue

            closes = data.get("indicators", {}).get("quote", [{}])[0].get("close", [])
            valid = [c for c in closes if c is not None]
            if not valid:
                result.append({"label": label, "value": "-", "change": "-"})
                continue

            price = valid[-1]
            prev = valid[-2] if len(valid) >= 2 else price
            change_pct = ((price - prev) / prev * 100) if prev else 0

            if label == "US 10Y":
                value = "{:.2f}%".format(price)
                change = "{:+.0f}bp".format((price - prev) * 100)
            elif label == "WTI":
                value = "${:.1f}".format(price)
                change = "{:+.1f}%".format(change_pct)
            elif label == "USD/KRW":
                value = "{:,.1f}".format(price)
                change = "{:+.1f}%".format(change_pct)
            else:
                value = "{:,.0f}".format(price)
                change = "{:+.1f}%".format(change_pct)

            result.append({"label": label, "value": value, "change": change})
        except Exception:
            result.append({"label": label, "value": "-", "change": "-"})
    return result


def _format_volume(vol):
    # type: (int) -> str
    if vol >= 1_000_000:
        return "{:.1f}M".format(vol / 1_000_000)
    if vol >= 1_000:
        return "{:.0f}K".format(vol / 1_000)
    return str(vol)
