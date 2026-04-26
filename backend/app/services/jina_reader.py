"""Strip-down article extractor using Jina Reader.

Free, no API key. Returns plain text suitable for an LLM prompt.
"""
from __future__ import annotations

import requests


JINA_BASE = "https://r.jina.ai/"


def fetch_article_text(url: str, max_chars: int = 8000, timeout: int = 15) -> str:
    """Return readable article text. Empty string on failure."""
    if not url:
        return ""
    target = url.strip()
    if not target.startswith("http"):
        target = "https://" + target
    try:
        res = requests.get(
            f"{JINA_BASE}{target}",
            headers={"Accept": "text/plain"},
            timeout=timeout,
        )
        res.raise_for_status()
        text = res.text or ""
    except Exception:
        return ""
    if len(text) > max_chars:
        text = text[:max_chars] + "\n[...truncated]"
    return text
