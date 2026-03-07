from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from xml.etree import ElementTree


GOOGLE_NEWS_RSS = (
    "https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
)
GOOGLE_TRANSLATE_API = (
    "https://translate.googleapis.com/translate_a/single"
    "?client=gtx&sl=auto&tl=ko&dt=t&q={text}"
)


def fetch_google_news(
    query: str = "반도체 OR HBM OR AI 데이터센터 OR 메모리",
) -> list[dict]:
    url = GOOGLE_NEWS_RSS.format(query=quote_plus(f"{query} when:7d"))
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; StockStar/0.1)",
            "Accept": "application/rss+xml, application/xml",
        },
    )

    with urlopen(request, timeout=20) as response:
        xml_bytes = response.read()

    root = ElementTree.fromstring(xml_bytes)
    items: list[dict] = []

    for item in root.findall("./channel/item")[:10]:
        title = item.findtext("title", default="Untitled")
        link = item.findtext("link", default="")
        pub_date = item.findtext("pubDate", default="")
        description = item.findtext("description", default="")

        normalized_title, source = _split_title_and_source(title)
        translated_title = _translate_to_korean(normalized_title)
        translated_summary = _translate_to_korean(
            _strip_html(description)[:280] or normalized_title
        )
        items.append(
            {
                "id": f"rss-{hashlib.sha1(link.encode('utf-8')).hexdigest()[:12]}",
                "title": translated_title,
                "summary": translated_summary,
                "source": source,
                "published_at": _to_iso(pub_date),
                "importance": _estimate_importance(normalized_title),
                "analysis_status": "pending",
                "event_type": "실시간 뉴스",
                "countries": ["US"] if "US" in source or "Reuters" in source else ["KR"],
                "positive_industries": _positive_industries(normalized_title),
                "negative_industries": [],
                "related_symbols": _related_symbols(normalized_title),
                "ai_summary": "방금 수집된 실시간 뉴스입니다. 분석 버튼을 눌러 이벤트 해석과 투자 논리로 변환하세요.",
                "counter_arguments": [
                    "첫 반응 이후 헤드라인 효과가 빠르게 약해질 수 있습니다.",
                    "기사 한 건만으로 실적 영향이 지속된다고 단정할 수 없습니다.",
                    "주가 반응과 후속 보도를 함께 확인해야 합니다.",
                ],
            }
        )

    return items


def _split_title_and_source(title: str) -> tuple[str, str]:
    if " - " in title:
        text, source = title.rsplit(" - ", 1)
        return text.strip(), source.strip()
    return title.strip(), "Google News"


def _strip_html(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text).replace("&nbsp;", " ").strip()


def _to_iso(pub_date: str) -> str:
    try:
        parsed = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %Z")
        return parsed.replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        return datetime.now(timezone.utc).isoformat()


def _estimate_importance(title: str) -> str:
    lowered = title.lower()
    if any(
        token in lowered
        for token in ["nvidia", "hbm", "ai", "semiconductor", "반도체", "메모리"]
    ):
        return "high"
    return "medium"


def _positive_industries(title: str) -> list[str]:
    lowered = title.lower()
    industries = []
    if any(
        token in lowered
        for token in ["semiconductor", "hbm", "memory", "ai", "반도체", "메모리"]
    ):
        industries.extend(["Semiconductor", "HBM"])
    if "oil" in lowered or "유가" in lowered or "원유" in lowered:
        industries.append("Energy")
    return industries


def _related_symbols(title: str) -> list[str]:
    lowered = title.lower()
    symbols = []
    if any(
        token in lowered
        for token in ["hbm", "memory", "semiconductor", "ai", "반도체", "메모리"]
    ):
        symbols.extend(["000660.KS", "005930.KS"])
    return symbols


def _translate_to_korean(text: str) -> str:
    if not text:
        return text
    if re.search(r"[가-힣]", text):
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
