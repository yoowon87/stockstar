import type { DashboardData, NewsItem } from "../types/api";

export const initialDashboardData: DashboardData = {
  date: "2026-03-09",
  market_status: "프리마켓 관망 구간",
  last_analysis_at: "2026-03-09T08:20:00+09:00",
  briefing_summary:
    "반도체와 AI 인프라가 주도 테마입니다. ETF는 방어축으로 유지하고, 미래산업 비중은 뉴스 강도에 따라 선별 대응하는 흐름이 적절합니다.",
  headline_news: [
    {
      id: "news-1",
      title: "미국 하이퍼스케일러들이 AI 데이터센터 투자 예산을 계속 확대",
      importance: "high",
      published_at: "2026-03-09T07:10:00+09:00",
    },
    {
      id: "news-2",
      title: "홍해 해상 리스크 재부각에 국제 유가 반등",
      importance: "medium",
      published_at: "2026-03-09T06:40:00+09:00",
    },
    {
      id: "news-3",
      title: "중국, 산업 수요 부양을 위한 추가 경기지원 시사",
      importance: "medium",
      published_at: "2026-03-08T22:20:00+09:00",
    },
  ],
  insights: {
    positive_industries: ["반도체", "HBM", "AI 인프라"],
    risk_industries: ["항공", "물류", "원자재 민감 업종"],
    focus_symbols: [
      {
        symbol: "000660.KS",
        name: "SK하이닉스",
        price: 214500,
        change_pct: 2.8,
        thesis: "HBM 수요 확대의 직접 수혜주",
      },
      {
        symbol: "VOO",
        name: "Vanguard S&P 500 ETF",
        price: 531,
        change_pct: 0.62,
        thesis: "시장 전체 노출과 장기 복리의 중심축",
      },
    ],
  },
  market_indicators: [
    { label: "Nasdaq", value: "18,420", change: "+0.7%" },
    { label: "S&P 500", value: "5,242", change: "+0.4%" },
    { label: "USD/KRW", value: "1,332.4", change: "-0.2%" },
    { label: "WTI", value: "$81.3", change: "+1.8%" },
    { label: "US 10Y", value: "4.11%", change: "+4bp" },
  ],
  watchlist: [
    {
      symbol: "VOO",
      name: "Vanguard S&P 500 ETF",
      price: 531,
      change_pct: 0.62,
      thesis: "시장 평균을 담는 코어 포지션",
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      price: 469,
      change_pct: 0.71,
      thesis: "클라우드와 AI 제품이 동시에 강한 해자기업",
    },
    {
      symbol: "000660.KS",
      name: "SK하이닉스",
      price: 214500,
      change_pct: 2.8,
      thesis: "HBM 공급 사이클의 선두 수혜 후보",
    },
  ],
};

export const initialNewsItems: NewsItem[] = [
  {
    id: "news-1",
    title: "미국 하이퍼스케일러들이 AI 데이터센터 투자 예산을 계속 확대",
    summary:
      "대형 클라우드 업체들이 AI 인프라 지출을 추가 확대하겠다고 밝히며 GPU와 HBM 공급망 수요 기대가 높아졌습니다.",
    source: "MockWire",
    published_at: "2026-03-09T07:10:00+09:00",
    importance: "high",
    analysis_status: "분석 완료",
    event_type: "AI 투자 확대",
    countries: ["US", "KR"],
    positive_industries: ["반도체", "HBM", "AI 인프라"],
    negative_industries: [],
    related_symbols: ["000660.KS", "005930.KS", "NVDA"],
    ai_summary:
      "AI 설비 투자 확대는 메모리와 서버 인프라 업종에 직접적 수혜를 줄 가능성이 높습니다. 특히 HBM 공급 능력과 고객사 구성이 확실한 종목이 우선적으로 반응할 수 있습니다.",
    counter_arguments: [
      "최근 주가 상승으로 기대감이 이미 상당 부분 반영됐을 수 있습니다.",
      "GPU 공급 병목이 이어지면 메모리 매출 인식 시점이 늦어질 수 있습니다.",
      "빅테크의 투자 속도가 둔화되면 기대보다 수혜 범위가 축소될 수 있습니다.",
    ],
  },
  {
    id: "news-2",
    title: "홍해 해상 리스크 재부각에 국제 유가 반등",
    summary:
      "해상 운송 차질 우려가 다시 커지면서 국제 유가가 반등했고, 운송비와 비용 구조에 민감한 업종의 부담 가능성이 제기됐습니다.",
    source: "Global Desk",
    published_at: "2026-03-09T06:40:00+09:00",
    importance: "medium",
    analysis_status: "미분석",
    event_type: "거시 리스크",
    countries: ["SA", "US"],
    positive_industries: ["에너지", "정유"],
    negative_industries: ["항공", "물류"],
    related_symbols: ["XLE", "010950.KS"],
    ai_summary:
      "에너지 가격 상승은 정유와 에너지 업종에 우호적일 수 있지만, 비용 민감 업종에는 단기 압박으로 작용할 수 있습니다.",
    counter_arguments: [
      "공급 차질이 일시적이면 유가 급등은 빠르게 완화될 수 있습니다.",
      "정유 업종은 정제마진 변화에 더 민감하게 반응할 수 있습니다.",
      "항공·물류 업체는 유가 헤지 전략으로 충격을 일부 상쇄할 수 있습니다.",
    ],
  },
  {
    id: "news-3",
    title: "중국, 산업 수요 부양을 위한 추가 경기지원 시사",
    summary:
      "중국의 추가 경기 부양 가능성이 언급되며 경기 민감 업종 회복 기대가 다시 형성되고 있습니다.",
    source: "Macro Brief",
    published_at: "2026-03-08T22:20:00+09:00",
    importance: "medium",
    analysis_status: "분석 대기",
    event_type: "정책",
    countries: ["CN"],
    positive_industries: ["기계", "조선"],
    negative_industries: [],
    related_symbols: ["009540.KS", "010140.KS"],
    ai_summary:
      "중국발 정책 기대는 수출 연관 산업에 긍정적으로 해석될 수 있지만, 실제 수요 회복으로 이어지는지는 추가 확인이 필요합니다.",
    counter_arguments: [
      "부양 기대가 실제 수요 회복보다 먼저 반영될 가능성이 큽니다.",
      "정책 발표와 집행 사이의 시차가 길어질 수 있습니다.",
      "중국 경기 반등 강도가 기대보다 약할 가능성도 있습니다.",
    ],
  },
];

export const syncNewsPool: NewsItem[] = [
  {
    id: "news-sync-1",
    title: "미국 장기금리 안정에 성장주 선호 회복",
    summary:
      "장기금리 부담이 다소 완화되면서 ETF와 대형 기술주 중심의 위험선호가 다시 살아나는 흐름입니다.",
    source: "Macro Pulse",
    published_at: "2026-03-09T08:05:00+09:00",
    importance: "medium",
    analysis_status: "미분석",
    event_type: "금리",
    countries: ["US"],
    positive_industries: ["ETF", "성장주"],
    negative_industries: [],
    related_symbols: ["QQQ", "MSFT", "AAPL"],
    ai_summary:
      "금리 안정은 밸류에이션 부담을 낮춰 성장 자산 선호를 자극할 수 있습니다.",
    counter_arguments: [
      "하루 단위 금리 변화만으로 추세 전환을 판단하기는 어렵습니다.",
      "실적 시즌이 시작되면 금리보다 실적이 더 중요해질 수 있습니다.",
      "성장주는 단기 반등 뒤 변동성이 다시 커질 수 있습니다.",
    ],
  },
  {
    id: "news-sync-2",
    title: "AI 설비 증설로 전력 인프라 기업 관심 확대",
    summary:
      "데이터센터 전력 수요가 증가하면서 전력 설비와 유틸리티 연관 기업에 대한 관심이 커지고 있습니다.",
    source: "Infra Note",
    published_at: "2026-03-09T08:12:00+09:00",
    importance: "medium",
    analysis_status: "미분석",
    event_type: "인프라",
    countries: ["US"],
    positive_industries: ["에너지", "전력 인프라", "AI 인프라"],
    negative_industries: [],
    related_symbols: ["NVDA", "XLU"],
    ai_summary:
      "AI 인프라 확대는 반도체뿐 아니라 전력과 유틸리티 체인까지 수혜 범위를 넓힐 수 있습니다.",
    counter_arguments: [
      "실제 CAPEX 집행 속도가 기대보다 느릴 수 있습니다.",
      "전력 인프라 수혜는 반도체보다 간접적입니다.",
      "정책과 규제 변화에 민감한 영역입니다.",
    ],
  },
];
