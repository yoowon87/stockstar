// BIGKinds one-click keyword searches.
// Edit this file to add/remove watch keywords.

export interface KeywordEntry {
  keyword: string;
  emoji?: string;
}

export const BIGKINDS_KEYWORDS: KeywordEntry[] = [
  { keyword: "HBM/메모리", emoji: "💾" },
  { keyword: "FC-BGA", emoji: "🔌" },
  { keyword: "AI 데이터센터", emoji: "🏢" },
  { keyword: "원전", emoji: "⚛️" },
  { keyword: "방산", emoji: "🛡️" },
  { keyword: "휴머노이드 로봇", emoji: "🤖" },
  { keyword: "비만치료제", emoji: "💊" },
  { keyword: "스테이블코인", emoji: "🪙" },
  { keyword: "우크라 재건", emoji: "🏗️" },
];

export function bigkindsSearchUrl(keyword: string): string {
  return `https://www.bigkinds.or.kr/v2/news/search.do?searchKey=${encodeURIComponent(keyword)}`;
}
