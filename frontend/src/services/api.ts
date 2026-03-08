import { initialDashboardData, initialNewsItems, syncNewsPool } from "../data/mockContentData";
import type { DashboardData, NewsItem, StockDetail, SyncNewsResponse } from "../types/api";

const DASHBOARD_KEY = "stockstar-dashboard";
const NEWS_KEY = "stockstar-news";

function readDashboard(): DashboardData {
  const stored = localStorage.getItem(DASHBOARD_KEY);
  return stored ? (JSON.parse(stored) as DashboardData) : initialDashboardData;
}

function readNews(): NewsItem[] {
  const stored = localStorage.getItem(NEWS_KEY);
  return stored ? (JSON.parse(stored) as NewsItem[]) : initialNewsItems;
}

function writeDashboard(data: DashboardData) {
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(data));
}

function writeNews(items: NewsItem[]) {
  localStorage.setItem(NEWS_KEY, JSON.stringify(items));
}

function ensureSeeded() {
  if (!localStorage.getItem(DASHBOARD_KEY)) {
    writeDashboard(initialDashboardData);
  }
  if (!localStorage.getItem(NEWS_KEY)) {
    writeNews(initialNewsItems);
  }
}

function delay<T>(value: T) {
  return new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(value), 180);
  });
}

export function getDashboard() {
  ensureSeeded();
  return delay(readDashboard());
}

export function getNewsList() {
  ensureSeeded();
  return delay(readNews());
}

export function getStockDetail(_: string) {
  return delay(null as unknown as StockDetail);
}

export async function generateDashboardBriefing() {
  ensureSeeded();
  const dashboard = readDashboard();
  const newsItems = readNews();
  const positive = aggregateTopTerms(newsItems, "positive_industries");
  const negative = aggregateTopTerms(newsItems, "negative_industries");

  const updated: DashboardData = {
    ...dashboard,
    date: new Date().toISOString().slice(0, 10),
    last_analysis_at: new Date().toISOString(),
    briefing_summary: `상위 테마는 ${positive[0] ?? "반도체"}입니다. 리스크 축은 ${
      negative[0] ?? "매크로 변수"
    }이며 최근 뉴스 ${newsItems.length}건 기준으로 요약했습니다.`,
    insights: {
      ...dashboard.insights,
      positive_industries: positive.slice(0, 3),
      risk_industries: negative.slice(0, 3),
    },
  };

  writeDashboard(updated);
  return delay(updated);
}

export async function analyzeNewsItem(newsId: string) {
  ensureSeeded();
  const newsItems = readNews();
  const updated = newsItems.map((item) =>
    item.id === newsId
      ? {
          ...item,
          analysis_status: "분석 완료",
          ai_summary: `${item.ai_summary} 로컬 PWA 분석 상태로 갱신되었습니다.`,
        }
      : item,
  );

  writeNews(updated);
  return delay(updated.find((item) => item.id === newsId) as NewsItem);
}

export async function analyzeStockItem(_: string) {
  return delay(null as unknown as StockDetail);
}

export async function syncNewsFeed() {
  ensureSeeded();
  const current = readNews();
  const existingIds = new Set(current.map((item) => item.id));
  const inserts = syncNewsPool.filter((item) => !existingIds.has(item.id));
  const updated = [...inserts, ...current];

  writeNews(updated);

  const dashboard = readDashboard();
  writeDashboard({
    ...dashboard,
    headline_news: updated.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.title,
      importance: item.importance,
      published_at: item.published_at,
    })),
  });

  return delay({
    inserted_count: inserts.length,
    total_count: updated.length,
  } satisfies SyncNewsResponse);
}

function aggregateTopTerms(
  items: NewsItem[],
  key: "positive_industries" | "negative_industries",
) {
  const counter = new Map<string, number>();
  items.forEach((item) => {
    item[key].forEach((value) => {
      counter.set(value, (counter.get(value) ?? 0) + 1);
    });
  });

  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => label);
}
