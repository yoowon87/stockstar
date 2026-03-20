from __future__ import annotations

import sqlite3
import json
from typing import Any, Dict, List, Tuple

from app.services.news_collector import fetch_google_news
from app.services.news_sources import REGION_QUERIES, normalize_title


def get_available_regions():
    # type: () -> List[Dict[str, str]]
    """Return list of available regions for the frontend."""
    return [
        {"code": r["region_code"], "gl": r["gl"], "label": _region_label(r["region_code"])}
        for r in REGION_QUERIES
    ]


def collect_single_region(region_code):
    # type: (str) -> Dict[str, Any]
    """Collect news from a single region. Returns items + stats."""
    region = None
    for r in REGION_QUERIES:
        if r["region_code"] == region_code:
            region = r
            break

    if region is None:
        return {"items": [], "error": "Unknown region: {}".format(region_code)}

    try:
        items = fetch_google_news(
            query=region["query"],
            gl=region["gl"],
            hl=region["hl"],
            ceid=region["ceid"],
            default_country=region["default_country"],
            max_items=5,
        )
    except Exception as e:
        return {"items": [], "error": str(e)}

    return {"items": items, "error": None, "region": region_code, "fetched": len(items)}


def collect_selected_regions(region_codes):
    # type: (List[str]) -> Dict[str, Any]
    """Collect from multiple regions sequentially. Used for batch fallback."""
    all_items = []  # type: List[Dict]
    errors = []  # type: List[str]

    for code in region_codes:
        result = collect_single_region(code)
        if result.get("error"):
            errors.append("{}: {}".format(code, result["error"]))
        all_items.extend(result.get("items", []))

    deduped = _deduplicate(all_items)

    return {
        "items": deduped,
        "stats": {
            "total_fetched": len(all_items),
            "after_dedup": len(deduped),
            "regions_queried": len(region_codes),
            "errors": errors,
        },
    }


def _deduplicate(items):
    # type: (List[Dict]) -> List[Dict]
    """Remove duplicate articles based on normalized title hash."""
    seen = set()  # type: set
    unique = []  # type: List[Dict]
    for item in items:
        key = normalize_title(item.get("title", ""))
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def insert_collected_news(items):
    # type: (List[Dict]) -> Tuple[int, int]
    """Insert collected news into SQLite. Returns (inserted_count, total_count)."""
    from app.db import DB_PATH

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    inserted = 0

    for item in items:
        cursor.execute("SELECT 1 FROM news_items WHERE id = ?", (item["id"],))
        if cursor.fetchone():
            continue

        try:
            cursor.execute(
                """INSERT INTO news_items (
                    id, title, summary, source, published_at, importance,
                    analysis_status, event_type, origin_country, speaker,
                    affected_countries, countries, positive_industries,
                    negative_industries, related_symbols, ai_summary,
                    counter_arguments, link, body
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item.get("id", ""),
                    item.get("title", ""),
                    item.get("summary", ""),
                    item.get("source", ""),
                    item.get("published_at", ""),
                    item.get("importance", "medium"),
                    item.get("analysis_status", "pending"),
                    item.get("event_type", ""),
                    item.get("origin_country", ""),
                    json.dumps(item.get("speaker", {}), ensure_ascii=False),
                    json.dumps(item.get("affected_countries", []), ensure_ascii=False),
                    json.dumps(item.get("countries", []), ensure_ascii=False),
                    json.dumps(item.get("positive_industries", []), ensure_ascii=False),
                    json.dumps(item.get("negative_industries", []), ensure_ascii=False),
                    json.dumps(item.get("related_symbols", []), ensure_ascii=False),
                    item.get("ai_summary", ""),
                    json.dumps(item.get("counter_arguments", []), ensure_ascii=False),
                    item.get("link", ""),
                    item.get("body", ""),
                ),
            )
            inserted += 1
        except sqlite3.IntegrityError:
            continue

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM news_items")
    total = cursor.fetchone()[0]

    conn.close()
    return inserted, total


def _region_label(code):
    # type: (str) -> str
    # No emoji flags here — Python 3.7 on Windows has surrogate encoding issues
    # Frontend will add flags from country_geocode.json
    labels = {
        "US": "US",
        "KR": "KR",
        "JP": "JP",
        "CN": "CN",
        "TW": "TW",
        "DE": "DE",
        "GB": "GB",
        "IN": "IN",
        "SA": "SA",
        "FR": "FR",
    }
    return labels.get(code, code)
