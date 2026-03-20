from __future__ import annotations
import os
import json
from typing import Dict, Any

import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY", "")

# GPT-4o-mini pricing (per 1M tokens)
PRICING = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-4o": {"input": 2.50, "output": 10.00},
}

ANALYSIS_PROMPT = """당신은 글로벌 금융 뉴스를 분석하는 투자 전문가입니다.

## 분석할 뉴스
- 제목: {title}
- 요약: {summary}
- 출처: {source}
- 발생국: {origin_country}
- 발화자: {speaker_name}
{body_section}

## 요구사항
아래 항목을 깊이 있게 분석하여 JSON으로 응답하세요:

1. **ai_summary**: 이 뉴스가 투자자에게 의미하는 바를 구체적으로 해석 (한국어, 4-5문장). 단순 요약이 아니라 투자 시사점, 수혜/피해 섹터, 시장 영향 방향성을 포함.
2. **counter_arguments**: 이 뉴스의 긍정적 해석에 반하는 반대 논리 3개 (각 1-2문장)
3. **positive_industries**: 수혜 산업 리스트 (한국어, 3-5개)
4. **negative_industries**: 피해 산업 리스트 (한국어, 2-4개)
5. **affected_countries**: 영향받는 국가 (ISO 2자리 코드 + positive/negative/neutral)
6. **importance**: high/medium/low
7. **event_type**: 이벤트 유형 (예: AI 투자, 금리 정책, 지정학 리스크 등)
8. **investment_action**: 투자자가 취할 수 있는 구체적 액션 1-2문장

다음 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{{
  "ai_summary": "...",
  "counter_arguments": ["...", "...", "..."],
  "positive_industries": ["...", "..."],
  "negative_industries": ["...", "..."],
  "affected_countries": [{{"country": "XX", "direction": "positive"}}],
  "importance": "high",
  "event_type": "...",
  "investment_action": "..."
}}"""


def analyze_news(news_data):
    # type: (Dict[str, Any]) -> Dict[str, Any]
    """Analyze a news item using OpenAI GPT-4o-mini. Returns analysis + token usage."""
    if not openai.api_key:
        raise ValueError("OPENAI_API_KEY not set")

    model = "gpt-4o-mini"
    speaker = news_data.get("speaker", {})
    speaker_name = speaker.get("name", "") if isinstance(speaker, dict) else ""

    body = news_data.get("body", "")
    body_section = ""
    if body and len(body) > 50:
        body_section = "\n## 기사 본문 (발췌)\n{}".format(body[:1200])

    prompt = ANALYSIS_PROMPT.format(
        title=news_data.get("title", ""),
        summary=news_data.get("summary", ""),
        source=news_data.get("source", ""),
        origin_country=news_data.get("origin_country", ""),
        speaker_name=speaker_name,
        body_section=body_section,
    )

    response = openai.ChatCompletion.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a financial news analyst. Respond only with valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1200,
    )

    content = response.choices[0].message.content.strip()

    # Token usage
    usage = response.get("usage", {})
    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)
    total_tokens = usage.get("total_tokens", 0)

    # Calculate cost
    pricing = PRICING.get(model, PRICING["gpt-4o-mini"])
    input_cost = input_tokens / 1_000_000 * pricing["input"]
    output_cost = output_tokens / 1_000_000 * pricing["output"]
    total_cost = input_cost + output_cost

    # Parse JSON from response (handle markdown code blocks)
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]
    content = content.strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        result = {
            "ai_summary": content,
            "counter_arguments": [],
            "positive_industries": [],
            "negative_industries": [],
            "affected_countries": [],
            "importance": "medium",
            "event_type": "",
            "investment_action": "",
        }

    result["analysis_status"] = "\ubd84\uc11d \uc644\ub8cc"
    result["token_usage"] = {
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "cost_usd": round(total_cost, 6),
        "cost_krw": round(total_cost * 1450, 2),
    }

    return result
