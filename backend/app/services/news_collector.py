from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from app.services.news_sources import (
    guess_origin_country,
    is_quality_article,
    HIGH_IMPORTANCE_KEYWORDS,
)


GOOGLE_NEWS_RSS = (
    "https://news.google.com/rss/search?q={query}&hl={hl}&gl={gl}&ceid={ceid}"
)
GOOGLE_TRANSLATE_API = (
    "https://translate.googleapis.com/translate_a/single"
    "?client=gtx&sl=auto&tl=ko&dt=t&q={text}"
)


def fetch_google_news(
    query="",
    gl="KR",
    hl="ko",
    ceid="KR:ko",
    default_country="KR",
    max_items=5,
):
    # type: (str, str, str, str, str, int) -> List[Dict]
    """Fetch news from Google News RSS for a specific region."""
    if not query:
        query = "\ubc18\ub3c4\uccb4 OR HBM OR AI \ub370\uc774\ud130\uc13c\ud130 OR \uba54\ubaa8\ub9ac"

    url = GOOGLE_NEWS_RSS.format(
        query=quote_plus("{} when:7d".format(query)),
        hl=hl,
        gl=gl,
        ceid=quote_plus(ceid),
    )
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; StockStar/0.1)",
            "Accept": "application/rss+xml, application/xml",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            xml_bytes = response.read()
    except Exception:
        return []

    root = ElementTree.fromstring(xml_bytes)
    items = []  # type: List[Dict]

    for item in root.findall("./channel/item")[:max_items]:
        title = item.findtext("title", default="Untitled")
        link = item.findtext("link", default="")
        pub_date = item.findtext("pubDate", default="")
        description = item.findtext("description", default="")

        normalized_title, source = _split_title_and_source(title)

        # Quality filter
        if not is_quality_article(normalized_title, source):
            continue

        # Translate to Korean
        translated_title = _translate_to_korean(normalized_title)
        translated_summary = _translate_to_korean(
            _strip_html(description)[:280] or normalized_title
        )

        # Determine origin country from source
        origin_country = guess_origin_country(source, default_country)

        # Scrape article body from the original link
        body_text = _scrape_article_body(link)
        if body_text:
            translated_summary = _translate_to_korean(body_text[:500])

        items.append(
            {
                "id": "rss-{}".format(hashlib.sha1(link.encode("utf-8")).hexdigest()[:12]),
                "title": translated_title,
                "summary": translated_summary,
                "source": source,
                "link": link,
                "body": body_text,
                "published_at": _to_iso(pub_date),
                "importance": _estimate_importance(normalized_title),
                "analysis_status": "pending",
                "event_type": "\uc2e4\uc2dc\uac04 \ub274\uc2a4",
                "origin_country": origin_country,
                "speaker": {"name": "", "type": "unknown", "country": origin_country},
                "affected_countries": [],
                "countries": [origin_country],
                "positive_industries": _positive_industries(normalized_title),
                "negative_industries": [],
                "related_symbols": _related_symbols(normalized_title),
                "ai_summary": "\ubc29\uae08 \uc218\uc9d1\ub41c \uc2e4\uc2dc\uac04 \ub274\uc2a4\uc785\ub2c8\ub2e4. \ubd84\uc11d \ubc84\ud2bc\uc744 \ub20c\ub7ec \uc774\ubca4\ud2b8 \ud574\uc11d\uacfc \ud22c\uc790 \ub17c\ub9ac\ub85c \ubcc0\ud658\ud558\uc138\uc694.",
                "counter_arguments": [
                    "\uccab \ubc18\uc751 \uc774\ud6c4 \ud5e4\ub4dc\ub77c\uc778 \ud6a8\uacfc\uac00 \ube60\ub974\uac8c \uc57d\ud574\uc9c8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
                    "\uae30\uc0ac \ud55c \uac74\ub9cc\uc73c\ub85c \uc2e4\uc801 \uc601\ud5a5\uc774 \uc9c0\uc18d\ub41c\ub2e4\uace0 \ub2e8\uc815\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.",
                    "\uc8fc\uac00 \ubc18\uc751\uacfc \ud6c4\uc18d \ubcf4\ub3c4\ub97c \ud568\uaed8 \ud655\uc778\ud574\uc57c \ud569\ub2c8\ub2e4.",
                ],
            }
        )

    return items


def _split_title_and_source(title):
    # type: (str) -> Tuple[str, str]
    if " - " in title:
        text, source = title.rsplit(" - ", 1)
        return text.strip(), source.strip()
    return title.strip(), "Google News"


def _strip_html(text):
    # type: (str) -> str
    return re.sub(r"<[^>]+>", "", text).replace("&nbsp;", " ").strip()


def _to_iso(pub_date):
    # type: (str) -> str
    try:
        parsed = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
        return parsed.replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return datetime.now(timezone.utc).isoformat()


def _estimate_importance(title):
    # type: (str) -> str
    lowered = title.lower()
    for keyword in HIGH_IMPORTANCE_KEYWORDS:
        if keyword in lowered:
            return "high"
    return "medium"


def _positive_industries(title):
    # type: (str) -> List[str]
    lowered = title.lower()
    industries = []
    if any(
        token in lowered
        for token in ["semiconductor", "hbm", "memory", "ai", "\ubc18\ub3c4\uccb4", "\uba54\ubaa8\ub9ac", "半導体", "半导体"]
    ):
        industries.extend(["\ubc18\ub3c4\uccb4", "HBM"])
    if any(token in lowered for token in ["oil", "\uc720\uac00", "\uc6d0\uc720", "crude", "\u539f\u6cb9"]):
        industries.append("\uc5d0\ub108\uc9c0")
    if any(token in lowered for token in ["bank", "rate", "\uae08\ub9ac", "\u91d1\u5229"]):
        industries.append("\uae08\uc735")
    return industries


def _related_symbols(title):
    # type: (str) -> List[str]
    lowered = title.lower()
    symbols = []
    if any(
        token in lowered
        for token in ["hbm", "memory", "semiconductor", "\ubc18\ub3c4\uccb4", "\uba54\ubaa8\ub9ac"]
    ):
        symbols.extend(["000660.KS", "005930.KS"])
    if "tsmc" in lowered:
        symbols.append("TSM")
    if "nvidia" in lowered:
        symbols.append("NVDA")
    return symbols


def _scrape_article_body(url):
    # type: (str) -> str
    """Scrape article body text from the URL. Returns first ~1000 chars or empty."""
    if not url:
        return ""
    try:
        # Follow Google News redirect to actual article
        req = Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html",
        })
        with urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Extract text from <p> tags (simple extraction without heavy deps)
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, re.DOTALL | re.IGNORECASE)
        texts = []
        for p in paragraphs:
            clean = re.sub(r"<[^>]+>", "", p).strip()
            if len(clean) > 40:  # skip short fragments
                texts.append(clean)

        body = " ".join(texts)
        # Return first 1500 chars (enough for AI analysis)
        return body[:1500] if body else ""
    except Exception:
        return ""


def _translate_to_korean(text):
    # type: (str) -> str
    if not text:
        return text
    if re.search(r"[\uac00-\ud7a3]", text):
        return text

    url = GOOGLE_TRANSLATE_API.format(text=quote_plus(text))
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; StockStar/0.1)",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
        translated = "".join(part[0] for part in payload[0] if part and part[0])
        return translated.strip() or text
    except Exception:
        return text
