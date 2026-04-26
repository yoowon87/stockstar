# StockStar v3 — News Module 작업 지시서

> 대상: Claude Code (VSCode)
> 작성: 2026-04-26
> 저장소: github.com/Yoowon87/stockstar
> 배포: stockstar-ten.vercel.app

---

## 0. 작업 개요

세 단계로 진행한다. 각 단계 완료 후 배포·확인·다음 단계.

```
Phase A (즉시, 1~2시간)  : NewsHub — 언론사 + 키워드 원클릭 링크
Phase B (1~2일)         : News Vault — 메모/분석 저장·검색·태그
Phase C (2~3일)         : News Analyzer — Claude API 분석 + 자동 연결
```

각 Phase는 독립적으로 배포 가능하다. Phase A부터 차례로.

---

## 1. 설계 원칙 (모든 Phase 공통)

### 1.1 도구의 본질
- AI가 답을 주는 도구가 아니라, **MasterWon의 사고를 구조화하는 도구**다.
- 본인 판단이 먼저, AI는 검증·보완 역할.
- 모든 분석에 본인 코멘트 입력 칸이 있어야 한다.

### 1.2 절대 하지 않는 것
- ❌ AI가 예상 주가/목표가/매수가를 단일 숫자로 던지지 않는다 (앵커링 위험)
- ❌ "사세요"식 추천 멘트 금지
- ❌ Claude API 호출은 사용자가 명시적으로 누를 때만 (자동 X)

### 1.3 데이터 영속성
- 모든 분석·메모는 Supabase에 저장
- 종목 코드로 역방향 인덱스 — "이 종목 언급된 모든 분석" 조회 가능
- 태그로 분류 — 같은 사건의 분석들 자동 연결
- 시간 윈도우(진입 가능 기간) 추적

### 1.4 디자인
- 기존 stockstar v2/v3 톤 유지 (Tailwind + shadcn/ui)
- 다크 테마 우선
- 모바일 반응형 (출퇴근 도보 10분 사용)

---

## 2. Phase A: NewsHub (즉시 작업)

### 2.1 목적
MasterWon이 매일 아침·저녁 들어가는 외부 사이트들을 stockstar 한 화면에 모아서, 한 번에 클릭으로 점프할 수 있게 한다.

### 2.2 화면 위치
- 홈 대시보드 우측 또는 사이드바
- `/news` 라우트로 별도 페이지도 만든다 (전체 화면으로 보고 싶을 때)

### 2.3 구성 — 4개 섹션

**섹션 1: 메인 뉴스 사이트 (5개)**
- BIGKinds (한국 53개 언론 통합) — `https://www.bigkinds.or.kr`
- Reuters — `https://www.reuters.com`
- 연합뉴스 국제경제 — `https://www.yna.co.kr/international/all`
- DART (한국 공시) — `https://dart.fss.or.kr`
- 미래에셋 HTS (웹) — `https://securities.miraeasset.com`

**섹션 2: 캘린더 (사전 정보, 6개)**
- Investing.com 경제캘린더 (한국어) — `https://kr.investing.com/economic-calendar/`
- TradingEconomics — `https://tradingeconomics.com/calendar`
- Earnings Whispers (미국 실적) — `https://www.earningswhispers.com/`
- 한경 컨센서스 (한국 실적) — `https://consensus.hankyung.com`
- KIND 공시 — `https://kind.krx.co.kr`
- White House Schedule — `https://www.whitehouse.gov/briefings-statements/`

**섹션 3: 키워드 원클릭 검색 (BIGKinds 기준, 9개)**
각 키워드 클릭 시 BIGKinds의 해당 키워드 검색 결과로 점프.
URL 형식: `https://www.bigkinds.or.kr/v2/news/search.do?searchKey={encodeURIComponent(keyword)}`

키워드 목록:
- HBM/메모리
- FC-BGA
- AI 데이터센터
- 원전
- 방산
- 휴머노이드 로봇
- 비만치료제
- 스테이블코인
- 우크라 재건

**섹션 4: 외신 카테고리 (Reuters 기준, 5개)**
- Markets — `https://www.reuters.com/markets/`
- Tech — `https://www.reuters.com/technology/`
- China — `https://www.reuters.com/world/china/`
- Korea — `https://www.reuters.com/world/asia-pacific/`
- Energy — `https://www.reuters.com/business/energy/`

### 2.4 컴포넌트 명세

```
components/news-hub/
├── NewsHub.tsx              # 전체 컨테이너
├── NewsSection.tsx          # 섹션 한 개 (제목 + 버튼들)
├── NewsButton.tsx           # 클릭 가능한 칩
└── data/
    ├── news-sources.ts      # 위 4개 섹션 데이터 상수
    └── keywords.ts          # 키워드 9개 (Phase B/C에서 재사용)
```

### 2.5 동작
- 모든 링크는 `target="_blank" rel="noopener noreferrer"` 새 탭 열기
- 키워드는 `encodeURIComponent` 처리
- 모바일에서는 그리드 → 가로 스크롤 또는 2열 변경

### 2.6 키워드 편집
나중에 키워드를 추가/수정하려면 `keywords.ts` 파일만 편집하면 되도록 상수 분리.

---

## 3. Phase B: News Vault — 메모·분석 저장 시스템

### 3.1 목적
Claude.ai와 차별화되는 **영속성·검색·연결**을 갖춘 노트 시스템. AI 호출 없이도 본인 메모만으로 가치 발휘.

### 3.2 Supabase 스키마

```sql
-- ========================================
-- notes: 메모/분석 단위 (출처 무관)
-- ========================================
CREATE TABLE notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) NOT NULL,
  
  type            text NOT NULL CHECK (type IN ('news_analysis', 'memo', 'observation')),
  title           text NOT NULL,
  content         text,                    -- 본인 코멘트/메모
  
  -- 출처 (뉴스인 경우)
  source_url      text,
  source_name     text,                    -- "Reuters", "BIGKinds", "한경" 등
  source_excerpt  text,                    -- 원문 일부 (Phase C에서 자동 추출)
  published_at    timestamptz,             -- 원본 발행일
  
  -- AI 분석 결과 (Phase C에서 채움)
  analysis_result jsonb,
  
  -- 시간 윈도우
  action_window_start timestamptz,         -- 진입 가능 시작
  action_window_until timestamptz,         -- 진입 가능 만료
  
  -- 사후 검증
  verification_status text DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified_hit', 'verified_miss', 'expired')),
  verified_at     timestamptz,
  
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_type ON notes(type);
CREATE INDEX idx_notes_verification ON notes(verification_status)
  WHERE verification_status = 'pending';

-- ========================================
-- note_tags: 태그
-- ========================================
CREATE TABLE note_tags (
  note_id         uuid REFERENCES notes(id) ON DELETE CASCADE,
  tag             text NOT NULL,
  PRIMARY KEY (note_id, tag)
);

CREATE INDEX idx_note_tags_tag ON note_tags(tag);

-- ========================================
-- note_stocks: 종목 인덱스 (역방향 조회용)
-- ========================================
CREATE TABLE note_stocks (
  note_id         uuid REFERENCES notes(id) ON DELETE CASCADE,
  stock_code      text NOT NULL,
  stock_name      text NOT NULL,
  role            text NOT NULL
    CHECK (role IN ('beneficiary', 'victim', 'mention')),
  confidence      smallint CHECK (confidence BETWEEN 1 AND 5),
  rationale       text,                    -- 왜 이 종목이 영향받는가
  
  -- 가격 추적 (cron으로 자동 채움)
  price_at_note   numeric,
  price_after_1d  numeric,
  price_after_7d  numeric,
  price_after_30d numeric,
  
  PRIMARY KEY (note_id, stock_code)
);

CREATE INDEX idx_note_stocks_code ON note_stocks(stock_code);

-- ========================================
-- RLS 정책 (본인만 read/write)
-- ========================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_owner_all" ON notes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "note_tags_via_note" ON note_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "note_stocks_via_note" ON note_stocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_stocks.note_id AND notes.user_id = auth.uid())
  );
```

### 3.3 화면 3개

#### A. `/notes/new` — 새 메모/분석 작성

폼 구성:
- 종류 라디오: ◉ 뉴스 분석  ○ 메모  ○ 관찰
- URL 입력 (선택, 뉴스인 경우)
- 제목 (필수)
- 본문 (마크다운 에디터 또는 단순 textarea)
- **내 코멘트** 별도 칸 (필수, 본인 사고 기록)
- 태그 입력 (자동완성: 기존 태그 제안)
- 관련 종목 입력 (자동완성: theme_stocks 테이블에서 제안)
  - 종목별 role 선택 (수혜/피해/언급)
  - 종목별 confidence 1~5
  - 종목별 rationale (선택)
- 시간 윈도우 시작/종료 (선택, datetime-local)
- [Phase C: 🤖 Claude 분석 버튼 — 일단 비활성화]
- [💾 저장]

저장 시:
- `notes` insert
- `note_tags`에 태그 일괄 insert
- `note_stocks`에 종목 일괄 insert
- 종목 시점 가격(`price_at_note`)은 KIS API로 즉시 조회해서 채움

#### B. `/notes` — 검색·필터링 목록

상단 필터:
- 검색어 (title, content, source_excerpt 풀텍스트)
- 태그 필터 (다중 선택, 기존 태그 목록 표시)
- 종목 코드 필터
- 종류 필터 (분석/메모/관찰)
- 기간 필터 (오늘/7일/30일/전체)
- 검증 상태 필터 (대기/적중/실패/만료)

목록 카드:
```
📅 2026-04-26 22:14    [news_analysis] [verified_hit ✅]
이란 전쟁 → 폴리에스터 가격 상승

태그: #이란전쟁 #원유 #화학
종목: 효성TNC ⭐⭐⭐⭐⭐ +3.2%(7d) | 롯데케미칼 ⭐⭐⭐⭐ +1.1%(7d)

내 코멘트: "외신 → 한국 매체 시차 활용. 4/27 효성TNC 분할 진입..."
[상세 보기]
```

#### C. `/notes/[id]` — 상세 페이지

- 분석 본문
- 내 코멘트 (수정 가능)
- 관련 종목별 가격 추이 표
  - 시점 가격 / 1일 후 / 7일 후 / 30일 후
  - 등락률 자동 계산
- 같은 태그의 다른 분석 (자동 연결)
- 같은 종목 언급된 다른 분석 (자동 연결)
- [수정] [삭제] [매매 일지에 연결]

### 3.4 종목 페이지에 통합

기존 stockstar의 종목 상세 페이지가 있다면, 거기에 다음 섹션 추가:

```
📝 이 종목이 언급된 노트 (N건)
- 2026-04-26 ⭐⭐⭐⭐⭐ "이란 전쟁 → 폴리에스터..."
- 2026-04-15 ⭐⭐⭐⭐ "PTA 가격 5% 상승..."
- ...
```

`note_stocks` 테이블에서 `stock_code`로 역조회.

### 3.5 자동 가격 추적 (Cron)

`app/api/cron/track-note-prices/route.ts`:
- 매일 16:00 KST 실행 (한국장 마감 후)
- `note_stocks`에서 `price_after_1d IS NULL AND created_at < now() - interval '1 day'` 조건 종목 조회
- KIS API로 현재가 조회 → 채움
- 7일, 30일 동일 로직

검증 상태 자동 업데이트:
- 7일 후 등락률 계산
- 가장 confidence 높은 종목의 7일 수익률이 + → `verified_hit`
- - → `verified_miss`
- 시간 윈도우 만료되었으면 → `expired`

### 3.6 환경 변수

`.env.local`에 이미 있는 것 외 추가 없음.

---

## 4. Phase C: News Analyzer — Claude API 통합

### 4.1 목적
URL 또는 본문 입력 시 Claude가 한국 시장 영향을 분석하여 자동으로 종목/태그/시간 윈도우/리스크를 추출. 결과는 `notes`에 저장.

### 4.2 흐름

```
사용자 입력 (URL 또는 본문)
  ↓
Jina AI Reader (URL인 경우, 본문 자동 추출)
  https://r.jina.ai/{원본URL} — 무료, API 키 없음
  ↓
Claude Sonnet 4.6 호출 (시스템 프롬프트 + 본문)
  ↓
JSON 파싱
  ↓
사용자가 결과 검토
  ↓
[수정 가능] + 본인 코멘트 추가
  ↓
[저장] → notes/note_tags/note_stocks 적재
```

### 4.3 시스템 프롬프트

```typescript
const SYSTEM_PROMPT = `당신은 한국 주식 시장 분석가입니다.
주어진 뉴스를 읽고 한국 상장사에 미치는 영향을 분석합니다.

분석 원칙:
1. 인과관계가 명확한 종목만 제시 (3단계 이내 인과 사슬)
2. 시가총액 1,000억 이상 종목 위주
3. 일일 거래대금 500억 이상 종목 우선 (단타 가능 유동성)
4. 확신도는 1~5로 평가하되 정직하게 — ⭐⭐⭐⭐⭐는 인과관계 명확하고 시장 미반영일 때만
5. 리스크와 시간 윈도우 반드시 명시
6. 절대 금지: 예상 주가/목표가/매수가 단일 숫자 제시
7. "추천"이 아니라 "영향 분석" — 매매 결정은 사용자

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
    "confidence": 1~5
  }],
  "indirectBeneficiaries": [...같은 형식...],
  "victims": [...같은 형식...],
  "scenarios": {
    "bullish": "강세 시나리오",
    "neutral": "중립 시나리오",
    "bearish": "약세 시나리오"
  },
  "risks": ["리스크1", "리스크2"],
  "checklist": ["진입 전 확인할 항목1", "항목2"],
  "actionWindow": {
    "duration": "24시간|48시간|1주일|중장기",
    "rationale": "왜 이 시간 윈도우인가"
  },
  "marketReflection": "이미 시장에 반영된 정도 (미반영|부분반영|완전반영)"
}`;
```

### 4.4 컴포넌트

#### `/notes/new` 페이지에 [🤖 Claude 분석] 버튼 활성화

흐름:
1. 사용자가 URL 또는 본문 입력
2. 버튼 클릭 → 로딩 상태
3. API Route `/api/analyze-news` 호출
4. 분석 결과를 폼에 자동 채움 (편집 가능)
5. 사용자가 검토 + 본인 코멘트 추가
6. [저장] 클릭 시 모든 데이터 저장

#### `/api/analyze-news/route.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  const { url, content } = await req.json();
  
  // 1. 본문 추출 (URL인 경우)
  let articleText = content;
  if (url && !content) {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`);
    articleText = await jinaRes.text();
  }
  
  // 토큰 절약: 본문 너무 길면 8000자로 제한
  if (articleText.length > 8000) {
    articleText = articleText.substring(0, 8000) + '\n[...truncated]';
  }
  
  // 2. Claude 호출
  const client = new Anthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `다음 뉴스를 분석해주세요:\n\n${articleText}`
    }]
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const analysis = JSON.parse(cleaned);
  
  return Response.json(analysis);
}
```

### 4.5 비용 가드

- 분석 1회당 약 100~150원 (한화)
- 사용자에게 호출 전 확인 모달: "Claude 분석을 호출합니다. 약 150원 소요됩니다. 진행?"
- 일일 호출 한도 설정 (예: 일 20건 = 약 3,000원)
- 한도 초과 시 다음날까지 대기

### 4.6 저장 시 자동 매핑

분석 결과 저장 시:
- `analysis.tags` → `note_tags` 일괄 insert
- `analysis.directBeneficiaries + indirectBeneficiaries + victims` → `note_stocks` 일괄 insert
  - role은 각각 'beneficiary', 'beneficiary', 'victim'로 매핑
- `analysis.actionWindow.duration` → `action_window_until` 계산
  - "24시간" → now() + 24h
  - "48시간" → now() + 48h
  - "1주일" → now() + 7d
  - "중장기" → null (추적 X)

---

## 5. 디렉토리 구조 (Phase A~C 통합)

```
stockstar/
├─ app/
│  ├─ news/
│  │  └─ page.tsx                    # NewsHub 전체 화면 (Phase A)
│  ├─ notes/
│  │  ├─ page.tsx                    # 목록 (Phase B)
│  │  ├─ new/page.tsx                # 작성 (Phase B + C)
│  │  └─ [id]/page.tsx               # 상세 (Phase B)
│  └─ api/
│     ├─ analyze-news/route.ts       # Claude API (Phase C)
│     └─ cron/
│        └─ track-note-prices/route.ts  # 가격 추적 (Phase B)
│
├─ components/
│  ├─ news-hub/                      # Phase A
│  │  ├─ NewsHub.tsx
│  │  ├─ NewsSection.tsx
│  │  ├─ NewsButton.tsx
│  │  └─ data/
│  │     ├─ news-sources.ts
│  │     └─ keywords.ts
│  │
│  └─ notes/                         # Phase B + C
│     ├─ NoteForm.tsx                # 새 노트 작성
│     ├─ NoteList.tsx                # 목록
│     ├─ NoteCard.tsx                # 카드 한 개
│     ├─ NoteDetail.tsx              # 상세
│     ├─ NoteFilters.tsx             # 필터링 UI
│     ├─ TagInput.tsx                # 태그 자동완성
│     ├─ StockInput.tsx              # 종목 자동완성
│     └─ ClaudeAnalyzeButton.tsx     # Phase C 버튼
│
├─ lib/
│  ├─ news-analyzer/                 # Phase C
│  │  ├─ system-prompt.ts
│  │  ├─ jina-reader.ts
│  │  └─ types.ts
│  └─ notes/                         # Phase B
│     ├─ price-tracker.ts            # KIS API 호출
│     └─ verify.ts                   # 검증 상태 자동 업데이트
│
└─ supabase/
   └─ migrations/
      └─ v3_news_module.sql           # 위 SQL
```

---

## 6. 환경 변수 추가

`.env.local`에 추가:

```bash
# 기존 변수 유지
# ...

# Phase C용 (이미 있다면 skip)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Phase B 가격 추적용 (이미 있다면 skip)
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...

# Cron 보안
CRON_SECRET=...
```

Vercel 대시보드 Environment Variables에도 동일하게 등록 필요.

`vercel.json`에 cron 추가:
```json
{
  "crons": [
    {
      "path": "/api/cron/track-note-prices",
      "schedule": "0 7 * * 1-5"
    }
  ]
}
```
(KST 16:00 = UTC 07:00, 평일만)

---

## 7. 작업 순서 (반드시 순서대로)

### Step 1: Phase A NewsHub
- [ ] `components/news-hub/data/news-sources.ts` 작성
- [ ] `components/news-hub/data/keywords.ts` 작성
- [ ] `NewsButton.tsx`, `NewsSection.tsx`, `NewsHub.tsx` 작성
- [ ] `/news` 페이지에 NewsHub 마운트
- [ ] 홈 대시보드에도 NewsHub 작은 버전 마운트
- [ ] 모바일 반응형 확인
- [ ] 배포 후 직접 클릭해서 모든 링크 동작 확인

### Step 2: Phase B News Vault
- [ ] `supabase/migrations/v3_news_module.sql` 작성 + Supabase 적용
- [ ] RLS 정책 동작 확인 (본인만 보이는지)
- [ ] `lib/notes/price-tracker.ts` (KIS API)
- [ ] `/notes/new` 폼 (Claude 분석 버튼은 비활성화 상태)
- [ ] `/notes` 목록 + 필터
- [ ] `/notes/[id]` 상세
- [ ] 종목 페이지에 "이 종목 언급된 노트" 섹션 추가
- [ ] `/api/cron/track-note-prices` cron 작성
- [ ] 본인 메모 5건 정도 직접 작성하며 동작 검증

### Step 3: Phase C News Analyzer
- [ ] `lib/news-analyzer/jina-reader.ts`
- [ ] `lib/news-analyzer/system-prompt.ts`
- [ ] `/api/analyze-news/route.ts`
- [ ] `ClaudeAnalyzeButton.tsx` — 호출 전 확인 모달
- [ ] 일일 한도 카운터 (Supabase에 daily_api_usage 테이블)
- [ ] `/notes/new` 폼에 Claude 분석 결과 자동 채우기
- [ ] 분석 → 저장까지 전체 흐름 테스트
- [ ] 에러 핸들링 (Claude 응답 JSON 파싱 실패, Jina 실패 등)

---

## 8. 절대 하지 말 것 (다시 강조)

- ❌ AI가 만든 단일 예상 주가/목표가 표시 금지
- ❌ "추천" 단어 사용 금지 (영향 분석/시나리오로 표현)
- ❌ Claude 호출을 자동/주기적으로 하지 않음 (사용자 클릭 시만)
- ❌ 분석 결과를 본인 코멘트보다 시각적으로 더 강조하지 않음
- ❌ Anthropic API 키를 클라이언트 사이드 코드에 노출하지 않음 (반드시 API Route 경유)
- ❌ Jina Reader 결과를 그대로 사용자에게 표시하지 않음 (광고/오류 포함 가능)

---

## 9. 향후 확장 (이번 작업 범위 X)

다음 단계로 추가될 수 있는 것 (지금 만들지 말 것, 메모만):

- **Phase D**: 텔레그램 봇 알림 (시간 윈도우 시작/종료, 검증 결과)
- **Phase E**: 거시 캘린더 자동 수집 (DART API, FRED API)
- **Phase F**: 분석 간 자동 연결 그래프 시각화
- **Phase G**: 본인 매매 일지와 노트 연결 ("이 매매는 4/26 분석 기반")
- **Phase H**: 적중률 통계 대시보드 (Claude 분석 정확도 측정)

---

## 10. 작업 후 보고

각 Phase 완료 시 다음을 보고:
1. 배포 URL에서 동작 확인 스크린샷 (또는 기능 요약)
2. 발생한 이슈와 해결
3. 다음 Phase 시작 가능 여부

진행 중 막히는 부분은 즉시 멈추고 질문.

---

## 시작 명령

이 문서를 다 읽었으면 **Step 1 Phase A**부터 시작한다.
먼저 `components/news-hub/data/news-sources.ts`와 `keywords.ts`를 작성하고 보여줘.