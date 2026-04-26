"""Two-stage Claude analyzer for news articles.

Stage 1 (Haiku 4.5, ~21원): triage — is this worth analyzing for KR markets?
Stage 2 (Sonnet 4.6, ~67원): full structured analysis (only on triage pass).

Cost roughly: average call ~ 21원 * (1 - pass_rate) + (21+67)원 * pass_rate.
With ~30% pass rate: ~ 41원 / call vs flat 67원.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

import anthropic


HAIKU_MODEL = "claude-haiku-4-5-20251001"
SONNET_MODEL = "claude-sonnet-4-6"

# Per-call cost estimates in KRW (user-supplied; tweak if needed)
HAIKU_COST_KRW = 21.0
SONNET_COST_KRW = 67.0


def _client() -> anthropic.Anthropic:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY env var is required")
    return anthropic.Anthropic(api_key=key)


def _extract_json(text: str) -> Any:
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


# ─────────── Stage 1: triage ───────────

TRIAGE_PROMPT = """당신은 한국 주식 시장 분석가입니다.
아래 뉴스가 한국 상장사에 의미 있는 영향을 미치는지 빠르게 판정하세요.

다음 3가지를 JSON으로만 답하세요:
1. "korea_impact": Y/N — 한국 시장 영향 여부
2. "sector": 영향 분야 (반도체/방산/원전/2차전지/조선/AI/바이오/소재/금융/콘텐츠/기타) — 영향 없으면 빈 문자열
3. "worth_full_analysis": Y/N — 본격 분석할 가치가 있는가? (이미 시장에 충분히 반영된 일반 뉴스, 단순 가격 보도, 수치 발표 같은 건 N)
4. "reason": 한 문장 요약

JSON 외 텍스트 절대 금지. 형식:
{"korea_impact":"Y","sector":"반도체","worth_full_analysis":"Y","reason":"..."}"""


def triage(article_text: str) -> dict[str, Any]:
    if not article_text.strip():
        return {"korea_impact": "N", "sector": "", "worth_full_analysis": "N", "reason": "empty"}
    client = _client()
    response = client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=200,
        system=TRIAGE_PROMPT,
        messages=[{"role": "user", "content": f"뉴스 본문:\n{article_text[:6000]}"}],
    )
    text = "".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    parsed = _extract_json(text) or {}
    return {
        "korea_impact": (parsed.get("korea_impact") or "N").upper(),
        "sector": parsed.get("sector") or "",
        "worth_full_analysis": (parsed.get("worth_full_analysis") or "N").upper(),
        "reason": parsed.get("reason") or "",
    }


# ─────────── Stage 2: full analysis ───────────

ANALYSIS_PROMPT = """당신은 한국 주식 시장 분석가입니다.
주어진 뉴스를 읽고 한국 상장사에 미치는 영향을 분석합니다.

분석 원칙:
1. 인과관계가 명확한 종목만 제시 (3단계 이내 인과 사슬)
2. 시가총액 1,000억 이상 종목 위주
3. 일일 거래대금 500억 이상 종목 우선 (단타 가능 유동성)
4. 확신도는 1~5로 정직하게. 5는 인과관계 명확하고 시장 미반영일 때만
5. 리스크와 시간 윈도우 반드시 명시
6. 절대 금지: 예상 주가/목표가/매수가 단일 숫자 제시
7. "추천" 단어 사용 금지 — "영향 분석", "수혜/피해 후보"로 표현
8. 매매 결정은 사용자가 함

JSON 형식으로만 답하세요. 다른 텍스트 절대 금지.

스키마:
{
  "summary": "한 줄 요약 (50자 이내)",
  "causalChain": ["1단계", "2단계", "3단계"],
  "tags": ["태그1", "태그2"],
  "directBeneficiaries": [{
    "code": "종목코드 6자리",
    "name": "종목명",
    "rationale": "수혜 논리 (한 문장)",
    "confidence": 1
  }],
  "indirectBeneficiaries": [],
  "victims": [],
  "scenarios": {
    "bullish": "강세 시나리오",
    "neutral": "중립 시나리오",
    "bearish": "약세 시나리오"
  },
  "risks": ["리스크1"],
  "checklist": ["진입 전 확인 항목1"],
  "actionWindow": {
    "duration": "24시간|48시간|1주일|중장기",
    "rationale": "왜 이 시간 윈도우인가"
  },
  "marketReflection": "미반영|부분반영|완전반영"
}"""


def analyze(article_text: str) -> dict[str, Any]:
    client = _client()
    response = client.messages.create(
        model=SONNET_MODEL,
        max_tokens=3000,
        system=ANALYSIS_PROMPT,
        messages=[{"role": "user", "content": f"다음 뉴스를 분석해주세요:\n\n{article_text}"}],
    )
    text = "".join(b.text for b in response.content if getattr(b, "type", "") == "text")
    parsed = _extract_json(text)
    if not parsed:
        return {"error": "분석 결과 파싱 실패", "raw": text[:500]}
    return parsed


# ─────────── Orchestration ───────────

def analyze_url_or_text(
    url: str | None,
    text: str | None,
) -> dict[str, Any]:
    """Two-stage flow. Returns {stage1, stage2?, cost_krw, ...}."""
    from app.services import jina_reader, notes_store

    article = (text or "").strip()
    if not article and url:
        article = jina_reader.fetch_article_text(url)
    if not article:
        return {"error": "본문을 가져오지 못했습니다 (URL 접근 실패 또는 빈 본문)."}

    cost = 0.0
    haiku_passed = 0

    stage1 = triage(article)
    cost += HAIKU_COST_KRW

    triage_pass = (
        stage1.get("korea_impact") == "Y"
        and stage1.get("worth_full_analysis") == "Y"
    )

    payload: dict[str, Any] = {
        "stage1": stage1,
        "triage_pass": triage_pass,
        "cost_krw": cost,
    }

    if triage_pass:
        haiku_passed = 1
        try:
            stage2 = analyze(article)
            cost = HAIKU_COST_KRW + SONNET_COST_KRW
            payload["stage2"] = stage2
            payload["cost_krw"] = cost
            notes_store.bump_usage(haiku=1, haiku_passed=haiku_passed, sonnet=1, cost_krw=cost)
        except Exception as exc:
            payload["stage2_error"] = str(exc)[:200]
            notes_store.bump_usage(haiku=1, haiku_passed=0, sonnet=0, cost_krw=HAIKU_COST_KRW)
    else:
        notes_store.bump_usage(haiku=1, haiku_passed=0, sonnet=0, cost_krw=HAIKU_COST_KRW)

    payload["article_excerpt"] = article[:500]
    return payload
