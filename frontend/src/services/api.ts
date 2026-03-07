import type {
  DashboardData,
  NewsItem,
  StockDetail,
  SyncNewsResponse,
} from "../types/api";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8000/api";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }
  return response.json() as Promise<T>;
}

export function getDashboard() {
  return fetchJson<DashboardData>("/dashboard");
}

export function getNewsList() {
  return fetchJson<NewsItem[]>("/news");
}

export function getStockDetail(symbol: string) {
  return fetchJson<StockDetail>(`/stocks/${symbol}`);
}

export async function generateDashboardBriefing() {
  const response = await fetch(`${API_BASE}/dashboard/briefing`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to generate briefing");
  }
  return response.json() as Promise<DashboardData>;
}

export async function analyzeNewsItem(newsId: string) {
  const response = await fetch(`${API_BASE}/news/${newsId}/analyze`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Analysis failed for news ${newsId}`);
  }
  return response.json() as Promise<NewsItem>;
}

export async function analyzeStockItem(symbol: string) {
  const response = await fetch(`${API_BASE}/stocks/${symbol}/analyze`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Analysis failed for stock ${symbol}`);
  }
  return response.json() as Promise<StockDetail>;
}

export async function syncNewsFeed() {
  const response = await fetch(`${API_BASE}/news/sync`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to sync live news");
  }
  return response.json() as Promise<SyncNewsResponse>;
}
