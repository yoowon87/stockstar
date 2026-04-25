# Stockstar v3 — Theme Radar 모듈 개발 계획서

> 작성일: 2026-04-25
> 작성자: MasterWon (with Claude)
> 대상: Claude Code (VSCode 환경)
> 저장소: github.com/Yoowon87/stockstar

---

## 0. 한 페이지 요약

Stockstar v3는 v2의 **포트폴리오 관리 + 종목 분석** 위에, 단타용 **Theme Radar 모듈**을 얹는 확장이다.

### 핵심 사용자 시나리오

> MasterWon은 SL Tec 본업 중간에 5분 짬을 낸다. Theme Radar를 열면 **지금 이 순간 시장의 주도 테마 TOP 3**가 보인다. 각 카드에 거래대금/등락률/동반상승비율, 그리고 **대장주 + 후발주 4종**과 매칭된 뉴스가 표시된다. **트리플 컨펌(테마 형성 + 대장주 강세 + 뉴스 매칭) 충족 시 ✅ 표시**. 다시 본업으로 복귀. 장 마감 후 캘린더 히트맵으로 그날 테마 순환을 5분 복기.

### 투자 철학 (도구가 뒷받침해야 할 룰)

- **장투 95%**: 가치투자, 삼전·하이닉스·삼성전기 분할매수 (기존 stockstar v2 영역)
- **단투 5%**: 테마 대장주 트리플 컨펌 진입 (Theme Radar 신규 영역)
- 1회 진입 자금: 500만원 이상 → 유동성 기준 빡빡하게 적용
- 보유 기간: 1~2시간 ~ 1주일 (단기 스윙)

### 도구가 절대 하지 않을 것

- ❌ 매수/매도 신호 생성 ("사세요" 금지)
- ❌ 자동매매
- ❌ 손절가 알림 (미래에셋 HTS 기능 사용)
- ❌ 종목 추천 (리딩 행위)

도구는 **트리플 컨펌 조건 충족 알림**까지만 한다. 진입 결정과 차트 분석은 사용자가 수행.

---

## 1. v3 전체 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│                  Stockstar v3 (Next.js + Vercel)            │
├────────────────────────────────────────────────────────────┤
│  v2 기존 모듈 (유지)                                         │
│  ├─ 포트폴리오 관리                                          │
│  ├─ 종목 분석 (PER/PBR/ROE)                                 │
│  ├─ 매매 일지                                                │
│  └─ Claude API 종목 자문                                     │
├────────────────────────────────────────────────────────────┤
│  v3 신규 모듈: Theme Radar                                   │
│  ├─ /theme-radar           실시간 대시보드 (TOP 3)          │
│  ├─ /theme-calendar        캘린더 히트맵 (복기)             │
│  ├─ /theme-detail/:code    테마 상세 (종목별 시세)          │
│  ├─ /theme-history/:date   특정일 복기                      │
│  └─ /theme-admin           매핑 DB 편집 (Owner 전용)        │
└────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌────────────────────────────────────────────────────────────┐
│            Backend (Vercel Edge Functions + Cron)            │
│  ├─ poll-stocks       5분 폴링, KIS API → snapshots        │
│  ├─ poll-news         30분 폴링, 네이버 RSS → news         │
│  ├─ score-themes      5분, 실시간 점수 계산                 │
│  ├─ daily-snapshot    15:35 cron, 일별 점수 적재           │
│  └─ classify-news     Claude Haiku 호출, 테마 매칭         │
└────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
   ┌─────────┐       ┌──────────┐       ┌──────────────┐
   │Supabase │       │ KIS API  │       │ Claude Haiku │
   │  (DB)   │       │(시세)    │       │ (뉴스 분류)  │
   └─────────┘       └──────────┘       └──────────────┘
                            │
                     ┌──────────────┐
                     │ 네이버 금융   │
                     │ RSS (뉴스)   │
                     └──────────────┘
```

### 기술 스택

| 레이어 | 기술 | 비고 |
|---|---|---|
| 프론트 | Next.js 14 (App Router) | v2와 동일 |
| UI | Tailwind + shadcn/ui | v2와 동일 |
| 차트 | Recharts | 캘린더 히트맵, 시세 차트 |
| 상태 | TanStack Query (SWR도 가능) | 5분 자동 갱신 |
| DB | Supabase (Postgres) | v2 기존 사용, 테이블만 추가 |
| 배포 | Vercel | v2와 동일 |
| 스케줄러 | Vercel Cron Jobs | 무료 티어로 충분 |
| 시세 | KIS Developers API | 무료, 일 20,000건 |
| 뉴스 | 네이버 금융 RSS | 무료 |
| LLM | Claude Haiku 4.5 (claude-haiku-4-5-20251001) | 뉴스→테마 분류 |

### 운영 비용 추정

| 항목 | 월 비용 |
|---|---|
| Vercel Hobby | 0원 |
| Supabase Free | 0원 |
| KIS API | 0원 |
| Claude Haiku (일 100~300콜) | 1,000~3,000원 |
| **총합** | **월 3,000원 미만** |

---

## 2. 데이터 모델

### 2.1 Supabase 스키마 (v3 추가분)

```sql
-- ========================================
-- 1. 테마 마스터
-- ========================================
CREATE TABLE themes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,         -- "A01", "B03"
  name          text NOT NULL,                 -- "HBM/메모리"
  category      text NOT NULL,                 -- "A"~"E"
  category_name text NOT NULL,                 -- "반도체/AI 인프라"
  description   text,
  keywords      text[] DEFAULT '{}',           -- 뉴스 매칭용 키워드
  is_active     boolean DEFAULT true,
  display_order smallint DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_themes_active ON themes(is_active) WHERE is_active = true;
CREATE INDEX idx_themes_category ON themes(category);

-- ========================================
-- 2. 테마-종목 매핑
-- ========================================
CREATE TABLE theme_stocks (
  theme_id      uuid REFERENCES themes(id) ON DELETE CASCADE,
  stock_code    text NOT NULL,                 -- "000660"
  stock_name    text NOT NULL,
  is_leader     boolean DEFAULT false,         -- 잠재적 대장주
  weight        smallint DEFAULT 2,            -- 1=주력, 2=핵심후발, 3=관전
  note          text,                          -- "관전용, 매매비추" 등
  added_at      timestamptz DEFAULT now(),
  PRIMARY KEY (theme_id, stock_code)
);

CREATE INDEX idx_theme_stocks_code ON theme_stocks(stock_code);

-- ========================================
-- 3. 시세 스냅샷 (5분 폴링)
-- ========================================
CREATE TABLE stock_snapshots (
  id            bigserial PRIMARY KEY,
  stock_code    text NOT NULL,
  snapshot_at   timestamptz NOT NULL,
  price         numeric(12,2),
  change_pct    numeric(6,2),
  volume        bigint,
  trade_amount  bigint,                        -- 거래대금 (원)
  market_cap    bigint
);

CREATE INDEX idx_snapshots_code_time ON stock_snapshots(stock_code, snapshot_at DESC);
CREATE INDEX idx_snapshots_time ON stock_snapshots(snapshot_at DESC);

-- 30일 이상 된 데이터는 자동 정리 (별도 cron)

-- ========================================
-- 4. 일별 테마 점수 (캘린더 히트맵용)
-- ========================================
CREATE TABLE daily_theme_scores (
  date          date NOT NULL,
  theme_id      uuid REFERENCES themes(id),
  total_amount  bigint,
  avg_change    numeric(6,2),
  rising_ratio  numeric(4,3),                  -- 0.000 ~ 1.000
  score         numeric(4,3),
  rank          smallint,
  is_confirmed  boolean,
  leader_code   text,
  leader_name   text,
  leader_change numeric(6,2),
  rising_stocks jsonb,                         -- [{code, name, change}, ...]
  PRIMARY KEY (date, theme_id)
);

CREATE INDEX idx_daily_date ON daily_theme_scores(date DESC);
CREATE INDEX idx_daily_rank ON daily_theme_scores(date, rank);

-- ========================================
-- 5. 실시간 테마 점수 캐시 (5분 갱신)
-- ========================================
CREATE TABLE realtime_theme_scores (
  theme_id        uuid PRIMARY KEY REFERENCES themes(id),
  updated_at      timestamptz NOT NULL,
  total_amount    bigint,
  avg_change      numeric(6,2),
  rising_ratio    numeric(4,3),
  score           numeric(4,3),
  rank            smallint,
  is_confirmed    boolean,
  leader_code     text,
  leader_name     text,
  leader_change   numeric(6,2),
  news_count_24h  int DEFAULT 0,
  stocks_data     jsonb                        -- 종목 5개 시세 캐시
);

-- ========================================
-- 6. 뉴스 매칭
-- ========================================
CREATE TABLE theme_news (
  id              bigserial PRIMARY KEY,
  theme_id        uuid REFERENCES themes(id),
  published_at    timestamptz NOT NULL,
  title           text NOT NULL,
  url             text,
  source          text,
  matched_keywords text[],
  classified_by   text DEFAULT 'haiku',        -- 'haiku' | 'manual'
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_news_theme_time ON theme_news(theme_id, published_at DESC);

-- ========================================
-- 7. 어드민 변경 로그
-- ========================================
CREATE TABLE theme_admin_logs (
  id            bigserial PRIMARY KEY,
  changed_at    timestamptz DEFAULT now(),
  action        text,                          -- "ADD_STOCK", "DEACTIVATE_THEME"
  theme_code    text,
  detail        jsonb
);
```

### 2.2 RLS (Row-Level Security) 정책

```sql
-- 모든 사용자가 read 가능, write는 owner(MasterWon)만
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "themes_read" ON themes FOR SELECT USING (true);
CREATE POLICY "themes_write" ON themes FOR ALL
  USING (auth.uid() = '<MASTERWON_USER_ID>');

-- 동일하게 theme_stocks, theme_admin_logs도 처리
```

---

## 3. 핵심 로직

### 3.1 주도 테마 점수 계산

```typescript
// lib/theme-radar/score.ts

interface ThemeScoreInput {
  stockSnapshots: {
    code: string;
    name: string;
    changePct: number;
    tradeAmount: number;  // 원
    volume: number;
  }[];
}

interface ThemeScoreOutput {
  totalAmount: number;
  avgChange: number;
  risingRatio: number;
  score: number;          // 0.000 ~ 1.000
  isConfirmed: boolean;
  leader: { code: string; name: string; changePct: number };
}

export function calculateThemeScore(
  input: ThemeScoreInput
): ThemeScoreOutput {
  const { stockSnapshots } = input;

  // 1. 거래대금 합계 (정규화: 5,000억 = 1.0)
  const totalAmount = stockSnapshots.reduce((sum, s) => sum + s.tradeAmount, 0);
  const amountNorm = Math.min(totalAmount / 500_000_000_000, 1.0);

  // 2. 평균 등락률 (정규화: ±5% = ±1.0)
  const avgChange =
    stockSnapshots.reduce((sum, s) => sum + s.changePct, 0) / stockSnapshots.length;
  const changeNorm = Math.max(Math.min(avgChange / 5.0, 1.0), -1.0);

  // 3. 동반 상승 비율 (+1.0% 이상 종목 비율)
  const rising = stockSnapshots.filter(s => s.changePct > 1.0).length;
  const risingRatio = rising / stockSnapshots.length;

  // 4. 트리플 컨펌 조건
  const isConfirmed =
    risingRatio >= 0.6 &&                    // 60%+ 동반 상승
    avgChange >= 1.5 &&                       // 평균 +1.5%+
    totalAmount >= 100_000_000_000;          // 1,000억+ 거래대금

  // 5. 종합 점수
  const score =
    amountNorm * 0.5 +
    Math.max(changeNorm, 0) * 0.3 +
    risingRatio * 0.2;

  // 6. 대장주 식별 (거래대금 1위)
  const leader = [...stockSnapshots]
    .sort((a, b) => b.tradeAmount - a.tradeAmount)[0];

  return {
    totalAmount,
    avgChange,
    risingRatio,
    score,
    isConfirmed,
    leader: { code: leader.code, name: leader.name, changePct: leader.changePct },
  };
}
```

### 3.2 트리플 컨펌 판정

```typescript
// 컨펌 = 점수 + 뉴스 매칭
export function isTripleConfirmed(
  scoreResult: ThemeScoreOutput,
  newsCount24h: number
): boolean {
  return scoreResult.isConfirmed && newsCount24h >= 1;
}
```

### 3.3 뉴스→테마 분류 (Claude Haiku)

```typescript
// lib/theme-radar/classify-news.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function classifyNewsToThemes(
  headlines: { id: number; title: string }[],
  themes: { code: string; name: string; keywords: string[] }[]
): Promise<{ headlineId: number; themeCodes: string[] }[]> {
  const prompt = `
당신은 한국 주식 시장 분석가입니다. 아래 뉴스 헤드라인을 분석해 어떤 테마에 해당하는지 분류하세요.

[테마 목록]
${themes.map(t => `- ${t.code}: ${t.name} (키워드: ${t.keywords.join(', ')})`).join('\n')}

[뉴스 헤드라인]
${headlines.map(h => `${h.id}. ${h.title}`).join('\n')}

각 헤드라인이 어떤 테마에 해당하는지 JSON 배열로 답하세요. 해당 없으면 빈 배열.
형식: [{"headlineId": 1, "themeCodes": ["A01", "A04"]}, ...]
JSON 외 다른 텍스트 절대 금지.
`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
```

---

## 4. UI 설계

### 4.1 메인 대시보드 (`/theme-radar`)

```
┌─────────────────────────────────────────────────────────┐
│ 🔥 Theme Radar  •  2026-04-25 14:32 KST  •  자동갱신 5분│
│                                            [관리][새로고침]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🥇  HBM/메모리                              점수 0.84   │
│  ─────────────────────────────────────────────────────  │
│  거래대금 1.2조  |  평균 +4.2%  |  동반상승 80%  | ✅컨펌│
│                                                          │
│  대장주 [SK하이닉스]  +5.8%  거래대금 3,400억          │
│  ─────────────────────────────────────────────────────  │
│   삼성전자        +2.1%   1,800억                       │
│   한미반도체      +7.2%   650억                         │
│   이오테크닉스    +4.5%   320억                         │
│   테크윙          +3.8%   180억                         │
│                                                          │
│  📰 뉴스 3건                                             │
│   • 엔비디아 차세대 GPU에 HBM4 채택 (한경, 14:01)       │
│   • SK하이닉스 HBM4 양산 시점 앞당겨 (연합, 13:45)      │
│   • 삼성전자 HBM3E 12단 ... (전자신문, 12:30)           │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  🥈  원전                                    점수 0.71  │
│  ─────────────────────────────────────────────────────  │
│  ... (동일 구조)                                         │
└─────────────────────────────────────────────────────────┘
```

**컴포넌트 분리:**
- `<ThemeCard />`: 한 카드
- `<ThemeStockRow />`: 카드 내 종목 한 줄
- `<TripleConfirmBadge />`: ✅ / ⚠️ 표시
- `<NewsList />`: 뉴스 3건

### 4.2 캘린더 히트맵 (`/theme-calendar`)

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Theme Calendar  •  2026년 4월        [< 3월][5월 >]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│      월   화   수   목   금                              │
│   ┌────┬────┬────┬────┬────┐                            │
│   │░░░░│▒▒▒▒│▓▓▓▓│████│▓▓▓▓│   1주                     │
│   │A01 │A02 │C01 │A01 │A01 │                            │
│   ├────┼────┼────┼────┼────┤                            │
│   │▒▒▒▒│▓▓▓▓│████│████│▒▒▒▒│   2주                     │
│   │A01 │C03 │C03 │C03 │A01 │                            │
│   ├────┼────┼────┼────┼────┤                            │
│   │░░░░│▓▓▓▓│▓▓▓▓│████│▓▓▓▓│   3주                     │
│   │A04 │A01 │A01 │E07 │E07 │                            │
│   ├────┼────┼────┼────┼────┤                            │
│   │████│████│████│████│████│   4주 ← 베트남 순방        │
│   │E07 │C06 │C06 │C01 │A01 │                            │
│   └────┴────┴────┴────┴────┘                            │
│                                                          │
│   강도: ░░ 약  ▒▒ 중  ▓▓ 강  ██ 매우강                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [4/24 금요일 - 클릭됨]                                  │
│                                                          │
│  🥇 HBM/메모리        점수 0.84  대장: SK하이닉스 +5.8% │
│  🥈 원전              점수 0.71  대장: 두산에너 +4.1%  │
│  🥉 전선              점수 0.68  대장: 대한전선 +3.7%  │
│                                                          │
│  [전체 복기 보기 →]                                      │
└─────────────────────────────────────────────────────────┘
```

**컴포넌트 분리:**
- `<MonthHeatmap />`: 한 달치 그리드
- `<DayCell />`: 하루 셀 (색 강도 = 그날 1위 점수)
- `<DayDetailDrawer />`: 클릭 시 하단 또는 사이드 슬라이드

### 4.3 어드민 페이지 (`/theme-admin`)

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Theme Admin (Owner Only)                              │
├─────────────────────────────────────────────────────────┤
│ [+ 새 테마] [활성/비활성 토글] [순방 테마 갱신]          │
│                                                          │
│ 카테고리 필터: [A][B][C][D][E][전체]                     │
│                                                          │
│ ┌──┬──────┬──────────────┬────┬─────────┬─────┬─────┐  │
│ │A│ A01 │ HBM/메모리    │ 5  │ 활성    │편집│삭제│  │
│ │A│ A02 │ AI 가속기 PCB │ 5  │ 활성    │편집│삭제│  │
│ │E│ E07 │ 정책(순방국)  │ 5  │ 활성    │편집│삭제│  │
│ └──┴──────┴──────────────┴────┴─────────┴─────┴─────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 4주 개발 로드맵

### Week 1: 데이터 파이프라인 + 시드

**목표:** Supabase에 모든 시세가 5분마다 적재되는 상태.

**Task:**
- [ ] `supabase/migrations/v3_theme_radar_init.sql` — 스키마 7개 테이블 생성
- [ ] `supabase/seed/themes.sql` — 37개 테마 + 185종목 시드
- [ ] `lib/kis/client.ts` — KIS API 클라이언트 (인증, 토큰 갱신)
- [ ] `lib/kis/quote.ts` — 종목 시세 조회 (`inquire-price`)
- [ ] `lib/kis/ranking.ts` — 거래대금 상위 조회
- [ ] `app/api/cron/poll-stocks/route.ts` — 5분 cron, 매핑된 종목 시세 일괄 수집
- [ ] `vercel.json` — cron 등록 (장중 09:00~15:30, 5분 간격, KST)

**검증:** Supabase 대시보드에서 `stock_snapshots` 테이블에 1주일치 데이터 쌓이는지 확인.

### Week 2: 점수 계산 + 메인 대시보드

**목표:** 메인 대시보드에 TOP 3 카드 표시.

**Task:**
- [ ] `lib/theme-radar/score.ts` — `calculateThemeScore`
- [ ] `app/api/cron/score-themes/route.ts` — 5분 cron, `realtime_theme_scores` 갱신
- [ ] `app/theme-radar/page.tsx` — 메인 페이지
- [ ] `components/theme-radar/ThemeCard.tsx`
- [ ] `components/theme-radar/ThemeStockRow.tsx`
- [ ] `components/theme-radar/TripleConfirmBadge.tsx`
- [ ] TanStack Query로 5분마다 자동 갱신

**검증:** 장중 페이지 열어서 실시간 갱신 확인.

### Week 3: 뉴스 매칭 + 트리플 컨펌

**목표:** 뉴스가 자동 분류되어 카드에 ✅/⚠️ 표시.

**Task:**
- [ ] `lib/news/naver-rss.ts` — 네이버 금융 뉴스 RSS 파서
- [ ] `lib/theme-radar/classify-news.ts` — Claude Haiku 호출
- [ ] `app/api/cron/poll-news/route.ts` — 30분 cron
- [ ] `app/api/cron/classify-news/route.ts` — 신규 뉴스만 분류
- [ ] `<NewsList />` 컴포넌트
- [ ] 트리플 컨펌 로직 통합 (`isTripleConfirmed`)

**검증:** 뉴스 헤드라인 10건이 정확하게 분류되는지 수동 확인.

### Week 4: 캘린더 히트맵 + 어드민

**목표:** 일별 복기 가능 + 매핑 DB 편집 UI 완성.

**Task:**
- [ ] `app/api/cron/daily-snapshot/route.ts` — 15:35 cron, `daily_theme_scores` 적재
- [ ] `app/theme-calendar/page.tsx`
- [ ] `components/theme-radar/MonthHeatmap.tsx`
- [ ] `components/theme-radar/DayCell.tsx`
- [ ] `components/theme-radar/DayDetailDrawer.tsx`
- [ ] `app/theme-admin/page.tsx` — 매핑 DB CRUD
- [ ] `app/theme-history/[date]/page.tsx` — 특정일 상세

**검증:** 1주일치 히트맵 채워졌을 때 시각적 패턴 확인.

---

## 6. 디렉토리 구조 (제안)

```
stockstar/
├─ app/
│  ├─ (v2 기존 라우트 유지)
│  ├─ theme-radar/
│  │  └─ page.tsx
│  ├─ theme-calendar/
│  │  └─ page.tsx
│  ├─ theme-detail/
│  │  └─ [code]/page.tsx
│  ├─ theme-history/
│  │  └─ [date]/page.tsx
│  ├─ theme-admin/
│  │  └─ page.tsx
│  └─ api/
│     └─ cron/
│        ├─ poll-stocks/route.ts
│        ├─ poll-news/route.ts
│        ├─ score-themes/route.ts
│        ├─ classify-news/route.ts
│        └─ daily-snapshot/route.ts
│
├─ components/
│  └─ theme-radar/
│     ├─ ThemeCard.tsx
│     ├─ ThemeStockRow.tsx
│     ├─ TripleConfirmBadge.tsx
│     ├─ NewsList.tsx
│     ├─ MonthHeatmap.tsx
│     ├─ DayCell.tsx
│     └─ DayDetailDrawer.tsx
│
├─ lib/
│  ├─ kis/
│  │  ├─ client.ts          # 인증 + 토큰
│  │  ├─ quote.ts           # 시세 조회
│  │  └─ ranking.ts         # 거래대금 상위
│  ├─ theme-radar/
│  │  ├─ score.ts           # 점수 계산
│  │  ├─ classify-news.ts   # Haiku 분류
│  │  └─ types.ts
│  └─ news/
│     └─ naver-rss.ts
│
├─ supabase/
│  ├─ migrations/
│  │  └─ v3_theme_radar_init.sql
│  └─ seed/
│     └─ themes.sql
│
└─ vercel.json               # cron 정의
```

---

## 7. 테마 시드 데이터 (37 테마 / 185 종목)

> 별도 파일로 관리: `supabase/seed/themes.sql`

### A. 반도체/AI 인프라 (8개)

| 코드 | 테마명 | 대장주 | 후발주 |
|---|---|---|---|
| A01 | HBM/메모리 | SK하이닉스 | 삼성전자, 한미반도체, 이오테크닉스, 테크윙 |
| A02 | AI 가속기 PCB | 이수페타시스 | 코리아써키트, 심텍, 대덕전자, 티엘비 |
| A03 | FC-BGA/MLCC | 삼성전기 | 대덕전자, 심텍, 코리아써키트, 해성디에스 |
| A04 | 반도체 후공정/장비 | 한미반도체 | HPSP, 이오테크닉스, 피에스케이, 에프에스티 |
| A05 | 반도체 소재 | 원익QnC | 솔브레인, 동진쎄미켐, SK머티리얼즈, 후성 |
| A06 | 파운드리/시스템 | 삼성전자 | DB하이텍, 가온칩스, 에이디테크놀로지, 텔레칩스 |
| A07 | 메모리 테스트/검사 | 리노공업 | ISC, 티에스이, 마이크로컨텍솔, 윈팩 |
| A08 | 반도체 설계/IP | 가온칩스 | 오픈엣지테크놀로지, 칩스앤미디어, 텔레칩스, 에이디테크놀로지 |

### B. AI/플랫폼/SW/로봇 (7개)

| 코드 | 테마명 | 대장주 | 후발주 |
|---|---|---|---|
| B01 | AI 플랫폼/네이버 | NAVER | 카카오, 더존비즈온, 솔트룩스, 코난테크놀로지 |
| B02 | AI 데이터센터 | LS ELECTRIC | HD현대일렉트릭, 효성중공업, 가온전선, 제룡전기 |
| B03 | 휴머노이드 로봇 | 두산로보틱스 | 레인보우로보틱스, 로보티즈, 에스피지, 뉴로메카 |
| B04 | 산업용 로봇/자동화 | HD현대로보틱스 | 삼성에스디에스, 코웨이, 에스에프에이, 휴림로봇★ |
| B05 | 자율주행/모빌리티 | 현대모비스 | 만도, 모트렉스, 켐트로닉스, 라온피플 |
| B06 | 클라우드/SaaS | 카카오 | 더존비즈온, 케이아이엔엑스, 가비아, 영림원소프트랩 |
| B07 | AI 의료/바이오 | 루닛 | 뷰노, 딥노이드, 코어라인소프트, 제이엘케이 |

★ 휴림로봇 = `note: '관전용, 매매 비추 (작전성 우려)'`

### C. 에너지/방산/원전 (8개)

| 코드 | 테마명 | 대장주 | 후발주 |
|---|---|---|---|
| C01 | 원전 (대형) | 두산에너빌리티 | 한전기술, 한전KPS, 우리기술, 비에이치아이 |
| C02 | 원전 부품/SMR | HD현대일렉트릭 | 효성중공업, 우진엔텍, 보성파워텍, 일진파워 |
| C03 | 방산 (지상/체계) | 한화에어로스페이스 | 현대로템, LIG넥스원, 한화시스템, 풍산 |
| C04 | 방산 (항공/우주) | 한국항공우주 | 한화에어로스페이스, 한화시스템, LIG넥스원, 켄코아에어로스페이스 |
| C05 | 전력기기/변압기 | HD현대일렉트릭 | 효성중공업, LS ELECTRIC, 일진전기, 제룡전기 |
| C06 | 전선 | LS | 대한전선, 가온전선, 일진전기, LS에코에너지 |
| C07 | 풍력 | 씨에스윈드 | 씨에스베어링, 동국S&C, SK오션플랜트, 유니슨 |
| C08 | 태양광/신재생 | HD현대에너지솔루션 | 한화솔루션, SK이터닉스, 신성이엔지, 에스에너지 |

### D. 소재/산업재/조선 (6개)

| 코드 | 테마명 | 대장주 | 후발주 |
|---|---|---|---|
| D01 | 조선 | HD현대중공업 | 한화오션, 삼성중공업, HD한국조선해양, HD현대미포 |
| D02 | 조선 기자재 | HD현대마린엔진 | 케이에스피, 세진중공업, 한국카본, 동성화인텍 |
| D03 | 이차전지 셀 | LG에너지솔루션 | 삼성SDI, SK이노베이션, 코스모신소재, 솔루엠 |
| D04 | 이차전지 양극재 | 에코프로비엠 | 포스코퓨처엠, 엘앤에프, 코스모신소재, 에코프로 |
| D05 | 핵심광물/자원 | 포스코홀딩스 | 고려아연, 에코프로머티, LX인터내셔널, 영풍 |
| D06 | 우크라 재건/건설 | 현대건설 | 삼성E&A, HD현대인프라코어, HD현대건설기계, 두산밥캣 |

### E. 금융/바이오/정책 (8개)

| 코드 | 테마명 | 대장주 | 후발주 |
|---|---|---|---|
| E01 | 증권/STO | 키움증권 | 미래에셋증권, 한화투자증권, NH투자증권, 삼성증권 |
| E02 | 스테이블코인/디지털자산 | 카카오페이 | 갤럭시아머니트리, KG모빌리언스, NHN KCP, 다날 |
| E03 | 바이오 대형 | 삼성바이오로직스 | 셀트리온, 알테오젠, SK바이오팜, 유한양행 |
| E04 | 비만치료제 | 한미약품 | 펩트론, 인벤티지랩, 디앤디파마텍, 동아에스티 |
| E05 | 항암/신약 | 알테오젠 | 리가켐바이오, 에이비엘바이오, HLB, 큐리언트 |
| E06 | K-콘텐츠/엔터 | 하이브 | JYP Ent., 에스엠, 와이지엔터테인먼트, CJ ENM |
| E07 | 정책 (순방국) | 동적 변경 | 동적 변경 (어드민에서 매번 갱신) |
| E08 | 부동산/리츠 | 현대건설 | DL이앤씨, GS건설, 대우건설, 삼성E&A |

---

## 8. 환경 변수 (`.env.local` 추가)

```bash
# 기존 v2
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...

# v3 신규
KIS_APP_KEY=...
KIS_APP_SECRET=...
KIS_ACCOUNT_NO=...
CRON_SECRET=...                    # Vercel cron 보안용
```

### Vercel Cron 설정 (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/poll-stocks",
      "schedule": "*/5 0-6 * * 1-5"
    },
    {
      "path": "/api/cron/score-themes",
      "schedule": "*/5 0-6 * * 1-5"
    },
    {
      "path": "/api/cron/poll-news",
      "schedule": "*/30 0-7 * * 1-5"
    },
    {
      "path": "/api/cron/classify-news",
      "schedule": "*/30 0-7 * * 1-5"
    },
    {
      "path": "/api/cron/daily-snapshot",
      "schedule": "35 6 * * 1-5"
    }
  ]
}
```

> 모든 시간 UTC 기준. KST 09:00 = UTC 00:00, KST 15:30 = UTC 06:30.

---

## 9. 주의 사항 / 결정 보류 사항

### 즉시 시작 가능
- Supabase 스키마 작성, 시드 데이터 입력
- KIS API 회원가입 + 키 발급 (모의투자 계정으로 시작 권장)
- Mock 데이터로 UI 먼저 만들기

### 결정 보류 사항 (Week 1 시작 전 확정)
1. **KIS API vs 키움 OpenAPI+** 어느 쪽 사용?
   - KIS = REST, Vercel Edge에서 호출 가능
   - 키움 = Windows 전용 OCX, 별도 서버 필요
   - **권장: KIS Developers** (Vercel 환경 적합)
2. **인증 방식** — Supabase Auth?
   - v2에서 사용 중인 방식 유지
3. **Owner-only 페이지 보호** — 환경변수로 user_id 비교? 또는 Supabase RLS?
   - 권장: RLS + middleware 이중 방어

### 향후 확장 (v3.1+)
- Telegram/Discord 봇으로 트리플 컨펌 알림 푸시
- 모바일 PWA 지원 (장중 휴대폰에서 확인)
- LinguaWorld처럼 "테마 흐름 학습" 게이미피케이션
- 내 매매 일지와 테마 점수 연결 (이긴 매매 vs 진 매매의 테마 점수 분석)

---

## 10. 성공 기준 (도구가 잘 작동한다는 증거)

**Phase 1 (1개월 후):**
- 메인 대시보드가 장중에 5분마다 갱신된다
- 캘린더에 1주일치 데이터가 쌓여 시각적 패턴이 보인다
- 트리플 컨펌이 하루 평균 2~5건 발생한다 (너무 많거나 적으면 임계값 조정)

**Phase 2 (3개월 후):**
- MasterWon이 단타 진입 결정에 평균 5분 이내 사용한다
- 캘린더 복기 통해 "월요일은 X섹터, 수요일은 Y섹터" 같은 패턴 인식
- 트리플 컨펌 충족 종목 매매의 손익비가 일반 매매보다 명확히 우수

**Phase 3 (6개월 후):**
- 단타 비중을 5% → 7~10%로 늘릴지 정량 근거로 결정 가능
- 도구 없이 단타 못 하겠다고 느낄 만큼 자연스러운 워크플로 형성

---

## 11. 다음 액션 아이템 (Claude Code에서 시작)

VSCode + Claude Code에서 다음 순서로 진행:

```bash
# 1. 브랜치 생성
git checkout -b v3/theme-radar

# 2. 마이그레이션 파일 작성
mkdir -p supabase/migrations supabase/seed
# Claude Code: "Section 2.1의 SQL을 supabase/migrations/v3_theme_radar_init.sql로 만들어줘"

# 3. 시드 작성
# Claude Code: "Section 7의 테마 데이터를 supabase/seed/themes.sql INSERT 문으로 만들어줘"

# 4. KIS API 클라이언트
# Claude Code: "lib/kis/client.ts 작성. KIS Developers REST API용. 토큰 캐시 + 갱신 포함"

# 5. 첫 cron
# Claude Code: "app/api/cron/poll-stocks/route.ts 작성. 매핑된 종목 일괄 시세 조회 후 Supabase 적재"
```

---

**마지막 메모:**

이 도구는 **MasterWon의 매매 룰을 자동화하는 게 아니라, 매매 룰의 조건을 빠르게 시각화**하는 도구다. 진입 결정은 항상 사람이 한다. 이 원칙이 깨지는 순간 도구는 리딩방으로 변질된다.

캘린더 히트맵이 3개월 쌓이면 그 자체가 한국 시장 테마 순환의 데이터셋이 된다. 이건 어떤 유료 서비스에서도 못 얻는 자산이다. 이게 v3의 진짜 가치다.