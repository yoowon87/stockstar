// External news/data sites grouped by section.
// Adding/removing entries here automatically updates the NewsHub UI.

export interface NewsSource {
  label: string;
  url: string;
  hint?: string;
}

export interface NewsSectionData {
  id: string;
  title: string;
  subtitle?: string;
  sources: NewsSource[];
}

export const NEWS_SECTIONS: NewsSectionData[] = [
  {
    id: "main",
    title: "메인 뉴스 사이트",
    subtitle: "매일 아침/저녁 1차 점검",
    sources: [
      { label: "BIGKinds", url: "https://www.bigkinds.or.kr", hint: "한국 53개 언론 통합" },
      { label: "Reuters", url: "https://www.reuters.com" },
      { label: "연합뉴스 국제경제", url: "https://www.yna.co.kr/international/all" },
      { label: "DART", url: "https://dart.fss.or.kr", hint: "한국 공시" },
      { label: "미래에셋 HTS", url: "https://securities.miraeasset.com", hint: "웹 트레이딩" },
    ],
  },
  {
    id: "calendar",
    title: "캘린더 (사전 정보)",
    subtitle: "경제지표 · 실적 · 공시 · 정치 일정",
    sources: [
      { label: "Investing 경제캘린더", url: "https://kr.investing.com/economic-calendar/" },
      { label: "TradingEconomics", url: "https://tradingeconomics.com/calendar" },
      { label: "Earnings Whispers", url: "https://www.earningswhispers.com/", hint: "미국 실적" },
      { label: "한경 컨센서스", url: "https://consensus.hankyung.com", hint: "한국 실적" },
      { label: "KIND 공시", url: "https://kind.krx.co.kr" },
      { label: "White House Schedule", url: "https://www.whitehouse.gov/briefings-statements/" },
    ],
  },
  {
    id: "reuters_cats",
    title: "외신 카테고리",
    subtitle: "Reuters 섹션 직링크",
    sources: [
      { label: "Markets", url: "https://www.reuters.com/markets/" },
      { label: "Tech", url: "https://www.reuters.com/technology/" },
      { label: "China", url: "https://www.reuters.com/world/china/" },
      { label: "Korea", url: "https://www.reuters.com/world/asia-pacific/" },
      { label: "Energy", url: "https://www.reuters.com/business/energy/" },
    ],
  },
];
