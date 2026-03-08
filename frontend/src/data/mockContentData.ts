import type { DashboardData, NewsItem } from "../types/api";

export const initialDashboardData: DashboardData = {
  date: "2026-03-09",
  market_status: "프리마켓 점검 중",
  last_analysis_at: "2026-03-09T08:20:00+09:00",
  briefing_summary:
    "반도체와 AI 인프라가 오늘의 핵심 테마입니다. ETF는 방어축, 미래산업은 수익 기여 축으로 구분해 보는 편이 좋습니다.",
  headline_news: [
    {
      id: "news-1",
      title: "미국 하이퍼스케일러들이 AI 데이터센터 투자 예산을 계속 확대",
      importance: "high",
      published_at: "2026-03-09T07:10:00+09:00",
    },
    {
      id: "news-2",
      title: "홍해 해상 리스크 재부각에 유가 반등",
      importance: "medium",
      published_at: "2026-03-09T06:40:00+09:00",
    },
    {
      id: "news-3",
      title: "중국, 산업 수요 부양을 위한 선별적 경기부양 시사",
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
        thesis: "HBM 수요 확대의 직접 수혜",
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
    { label: "미국 10년물", value: "4.11%", change: "+4bp" },
  ],
  watchlist: [
    {
      symbol: "VOO",
      name: "Vanguard S&P 500 ETF",
      price: 531,
      change_pct: 0.62,
      thesis: "시장 평균을 장기 복리로 가져가는 코어 포지션",
    },
    {
      symbol: "MSFT",
      name: "Microsoft",
      price: 469,
      change_pct: 0.71,
      thesis: "클라우드와 AI 제품화가 동시에 가능한 해자기업",
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
      "대형 클라우드 업체들이 AI 인프라 지출을 한 차례 더 확대하겠다고 시사하며 GPU와 HBM 공급망 수요 기대를 높였습니다.",
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
      "AI 설비투자 확대는 고대역폭 메모리 공급업체에 직접적인 호재이며, 특히 HBM 생산능력과 하이퍼스케일러 고객 노출이 큰 종목에 유리합니다.",
    counter_arguments: [
      "최근 주가 상승에 기대감이 이미 상당 부분 반영되었을 수 있습니다.",
      "GPU 공급 병목이 실제 메모리 매출 인식 시점을 늦출 수 있습니다.",
      "클라우드 수익화가 둔화되면 설비투자 가이던스가 약해질 수 있습니다.",
    ],
  },
  {
    id: "news-2",
    title: "홍해 해상 리스크 재부각에 유가 반등",
    summary:
      "해상 운송 차질 우려가 다시 커지면서 국제유가가 반등했고 운송비 비중이 높은 업종의 비용 부담 우려가 되살아났습니다.",
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
      "에너지 가격 상승은 운송업보다 정유업에 상대적으로 유리하며 비용 민감 업종에는 부담으로 작용할 수 있습니다.",
    counter_arguments: [
      "공급 차질이 제한적이면 단기 유가 급등은 빠르게 되돌려질 수 있습니다.",
      "정유주는 정제마진 변동성에 계속 노출됩니다.",
      "운송주는 일부 연료비를 헤지할 수 있습니다.",
    ],
  },
  {
    id: "news-3",
    title: "중국, 산업 수요 부양을 위한 선별적 경기부양 시사",
    summary:
      "중국의 선별적 재정 신호는 일부 경기민감 업종 수요를 안정시킬 수 있지만 전면적 경기회복을 뜻하지는 않습니다.",
    source: "Macro Brief",
    published_at: "2026-03-08T22:20:00+09:00",
    importance: "medium",
    analysis_status: "분석 대기",
    event_type: "정책",
    countries: ["CN"],
    positive_industries: ["조선", "기계"],
    negative_industries: [],
    related_symbols: ["009540.KS", "010140.KS"],
    ai_summary:
      "수출 연계 산업재에는 우호적 해석이 가능하지만 중국 경기의 광범위한 반등으로 보기는 아직 이릅니다.",
    counter_arguments: [
      "부양책 헤드라인이 실제 수요 회복보다 먼저 나오는 경우가 많습니다.",
      "수출주는 환율과 수주 시점 변수에 계속 노출됩니다.",
      "정책이 실제 집행으로 이어질지는 아직 불확실합니다.",
    ],
  },
];

export const syncNewsPool: NewsItem[] = [
  {
    id: "news-sync-1",
    title: "미국 장기금리 안정에 성장주 선호 회복",
    summary:
      "장기금리가 진정되며 ETF와 대형 기술주 중심으로 위험자산 선호가 다시 살아나는 흐름입니다.",
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
      "금리 안정은 밸류에이션 할인 부담을 낮춰 성장 자산에 우호적으로 작용합니다.",
    counter_arguments: [
      "하루 금리 흐름만으로 추세 전환을 단정하기 어렵습니다.",
      "실적 시즌이 시작되면 금리보다 실적이 더 중요해질 수 있습니다.",
      "성장주 랠리는 빠르게 과열될 수 있습니다.",
    ],
  },
  {
    id: "news-sync-2",
    title: "AI 서버 증설로 전력 인프라 기업 관심 확대",
    summary:
      "데이터센터 전력 수요가 높아지며 전력 설비와 에너지 인프라 관련 투자 아이디어가 확장되고 있습니다.",
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
      "AI 인프라의 확장은 반도체뿐 아니라 전력과 냉각 체인으로도 수혜를 넓힐 수 있습니다.",
    counter_arguments: [
      "실제 CAPEX 집행 속도가 기대보다 느릴 수 있습니다.",
      "전력 인프라 수혜는 반도체보다 간접적입니다.",
      "정책과 규제 변화에 민감합니다.",
    ],
  },
];
