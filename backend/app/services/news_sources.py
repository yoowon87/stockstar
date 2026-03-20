from __future__ import annotations
import re
import unicodedata
from typing import List, Dict, Set


# 10 regional query profiles for Google News RSS
REGION_QUERIES = [
    {
        "region_code": "US",
        "gl": "US",
        "hl": "en",
        "ceid": "US:en",
        "query": "stock market OR Fed OR AI investment OR semiconductor",
        "default_country": "US",
    },
    {
        "region_code": "KR",
        "gl": "KR",
        "hl": "ko",
        "ceid": "KR:ko",
        "query": "반도체 OR HBM OR AI OR 금리 OR 증시",
        "default_country": "KR",
    },
    {
        "region_code": "JP",
        "gl": "JP",
        "hl": "ja",
        "ceid": "JP:ja",
        "query": "半導体 OR AI OR 日銀 OR 株式市場",
        "default_country": "JP",
    },
    {
        "region_code": "CN",
        "gl": "CN",
        "hl": "zh-CN",
        "ceid": "CN:zh-Hans",
        "query": "半导体 OR AI OR 经济 OR 股市",
        "default_country": "CN",
    },
    {
        "region_code": "TW",
        "gl": "TW",
        "hl": "zh-TW",
        "ceid": "TW:zh-Hant",
        "query": "半導體 OR TSMC OR AI",
        "default_country": "TW",
    },
    {
        "region_code": "DE",
        "gl": "DE",
        "hl": "de",
        "ceid": "DE:de",
        "query": "Aktienmarkt OR Halbleiter OR KI",
        "default_country": "DE",
    },
    {
        "region_code": "GB",
        "gl": "GB",
        "hl": "en",
        "ceid": "GB:en",
        "query": "stock market OR Bank of England OR semiconductor OR AI",
        "default_country": "GB",
    },
    {
        "region_code": "IN",
        "gl": "IN",
        "hl": "en",
        "ceid": "IN:en",
        "query": "stock market OR semiconductor OR RBI",
        "default_country": "IN",
    },
    {
        "region_code": "SA",
        "gl": "SA",
        "hl": "ar",
        "ceid": "SA:ar",
        "query": "\u0633\u0648\u0642 \u0627\u0644\u0623\u0633\u0647\u0645 OR \u0627\u0644\u0646\u0641\u0637",
        "default_country": "SA",
    },
    {
        "region_code": "FR",
        "gl": "FR",
        "hl": "fr",
        "ceid": "FR:fr",
        "query": "march\u00e9 actions OR semi-conducteur",
        "default_country": "FR",
    },
]


# Map news source names to ISO 2-letter country codes
SOURCE_COUNTRY_MAP = {
    # US sources
    "Reuters": "US",
    "Bloomberg": "US",
    "WSJ": "US",
    "Wall Street Journal": "US",
    "CNBC": "US",
    "CNN": "US",
    "AP News": "US",
    "Associated Press": "US",
    "The New York Times": "US",
    "New York Times": "US",
    "Washington Post": "US",
    "Forbes": "US",
    "MarketWatch": "US",
    "Barron's": "US",
    "Seeking Alpha": "US",
    "Yahoo Finance": "US",
    "Business Insider": "US",
    "The Motley Fool": "US",
    "TechCrunch": "US",
    # UK sources
    "Financial Times": "GB",
    "FT": "GB",
    "BBC": "GB",
    "BBC News": "GB",
    "The Guardian": "GB",
    "The Telegraph": "GB",
    "The Economist": "GB",
    # Japan sources
    "Nikkei": "JP",
    "Nikkei Asia": "JP",
    "NHK": "JP",
    "Japan Times": "JP",
    # China sources
    "Xinhua": "CN",
    "SCMP": "CN",
    "South China Morning Post": "CN",
    "Global Times": "CN",
    "Caixin": "CN",
    # Taiwan sources
    "DigiTimes": "TW",
    "DIGITIMES": "TW",
    "Taiwan News": "TW",
    "Focus Taiwan": "TW",
    # Korea sources
    "Yonhap": "KR",
    "\uc5f0\ud569\ub274\uc2a4": "KR",
    "\ud55c\uacbd": "KR",
    "\ud55c\uad6d\uacbd\uc81c": "KR",
    "\ub9e4\uc77c\uacbd\uc81c": "KR",
    "\uc870\uc120\uc77c\ubcf4": "KR",
    "\uc911\uc559\uc77c\ubcf4": "KR",
    "The Korea Herald": "KR",
    "Korea Times": "KR",
    "Korea JoongAng Daily": "KR",
    # India sources
    "Economic Times": "IN",
    "ET": "IN",
    "Mint": "IN",
    "Livemint": "IN",
    "NDTV": "IN",
    "Business Standard": "IN",
    "Times of India": "IN",
    "Moneycontrol": "IN",
    # Germany sources
    "Handelsblatt": "DE",
    "DW": "DE",
    "Deutsche Welle": "DE",
    "Der Spiegel": "DE",
    "FAZ": "DE",
    # France sources
    "Le Monde": "FR",
    "Les Echos": "FR",
    "BFM Business": "FR",
    "France 24": "FR",
    # Middle East sources
    "Arab News": "SA",
    "Saudi Gazette": "SA",
    "Al Arabiya": "SA",
    "Gulf News": "AE",
    "The National": "AE",
    "Al Jazeera": "QA",
    # Other
    "Straits Times": "SG",
    "Channel NewsAsia": "SG",
    "CNA": "SG",
    "ABC News Australia": "AU",
    "Sydney Morning Herald": "AU",
}


# Low-quality sources to skip
SOURCE_BLOCKLIST = {
    "PR Newswire",
    "GlobeNewswire",
    "Business Wire",
    "PRNewswire",
    "Cision",
    "Accesswire",
    "EIN Presswire",
    "Benzinga",
}


# High-importance keywords (case-insensitive)
HIGH_IMPORTANCE_KEYWORDS = [
    "nvidia", "hbm", "semiconductor", "tsmc", "fed", "fomc",
    "interest rate", "bank of japan", "ecb",
    "ai", "artificial intelligence",
    "\ubc18\ub3c4\uccb4", "\uba54\ubaa8\ub9ac", "\uae08\ub9ac",
    "半導体", "半导体",
]


def normalize_title(title):
    # type: (str) -> str
    """Normalize title for dedup: lowercase, strip punctuation, first 60 chars."""
    text = title.lower().strip()
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:60]


def is_quality_article(title, source=""):
    # type: (str, str) -> bool
    """Check if article passes quality filters."""
    if len(title.strip()) < 15:
        return False
    if source in SOURCE_BLOCKLIST:
        return False
    return True


def guess_origin_country(source, region_default):
    # type: (str, str) -> str
    """Guess origin country from source name. Falls back to region default."""
    # Direct match
    if source in SOURCE_COUNTRY_MAP:
        return SOURCE_COUNTRY_MAP[source]
    # Partial match (e.g., "Bloomberg News" matches "Bloomberg")
    source_lower = source.lower()
    for src_name, country in SOURCE_COUNTRY_MAP.items():
        if src_name.lower() in source_lower or source_lower in src_name.lower():
            return country
    return region_default
