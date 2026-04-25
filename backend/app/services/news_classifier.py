"""Classify news headlines into theme codes using Claude Haiku 4.5."""
from __future__ import annotations

import json
import os
import re
from typing import Any

import anthropic


HAIKU_MODEL = "claude-haiku-4-5-20251001"


def _client() -> anthropic.Anthropic:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY env var is required")
    return anthropic.Anthropic(api_key=key)


def classify_headlines_to_themes(
    headlines: list[dict[str, Any]],
    themes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return [{headline_id, theme_codes: list[str]}, ...].

    `headlines`: [{id, title}]
    `themes`: [{code, name, keywords}]
    """
    if not headlines or not themes:
        return []

    theme_section = "\n".join(
        f"- {t['code']}: {t['name']} (키워드: {', '.join(t.get('keywords', []) or [])})"
        for t in themes
    )
    headline_section = "\n".join(f"{h['id']}. {h['title']}" for h in headlines)

    prompt = f"""당신은 한국 주식 시장 분석가입니다. 아래 뉴스 헤드라인을 분석해 어떤 테마에 해당하는지 분류하세요.

[테마 목록]
{theme_section}

[뉴스 헤드라인]
{headline_section}

각 헤드라인이 어떤 테마에 해당하는지 JSON 배열로만 답하세요. 해당 없으면 빈 배열.
형식: [{{"headline_id": 1, "theme_codes": ["A01", "A04"]}}, ...]
JSON 외 다른 텍스트 절대 금지."""

    client = _client()
    response = client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = ""
    for block in response.content:
        if getattr(block, "type", "") == "text":
            text += block.text
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # try to extract first JSON array
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if not match:
            return []
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return []
