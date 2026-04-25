"""Naver Finance RSS feed parser."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import feedparser


# Naver Finance category feeds (subset most relevant to KRX themes)
NAVER_FEEDS = [
    ("https://finance.naver.com/news/news_list.naver?mode=RSS&category=mainnews", "main"),
    ("https://finance.naver.com/news/news_list.naver?mode=RSS&category=stock", "stock"),
    ("https://finance.naver.com/news/news_list.naver?mode=RSS&category=industry", "industry"),
    ("https://finance.naver.com/news/news_list.naver?mode=RSS&category=market", "market"),
]


def fetch_naver_finance_rss(per_feed_limit: int = 20) -> list[dict[str, Any]]:
    """Fetch and merge headlines from configured Naver Finance feeds.

    Returns list of {url, title, source, published_at(ISO str)} entries.
    """
    items: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for url, label in NAVER_FEEDS:
        try:
            parsed = feedparser.parse(url)
        except Exception:
            continue
        for entry in (parsed.entries or [])[:per_feed_limit]:
            link = getattr(entry, "link", None)
            title = getattr(entry, "title", None)
            if not link or not title:
                continue
            if link in seen_urls:
                continue
            seen_urls.add(link)

            published_at = _parse_published(entry)
            items.append(
                {
                    "url": link,
                    "title": title.strip(),
                    "source": f"네이버 {label}",
                    "published_at": published_at,
                }
            )
    return items


def _parse_published(entry) -> str:
    parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if parsed:
        try:
            dt = datetime(*parsed[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).isoformat()
