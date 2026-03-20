const API_BASE = "http://localhost:8000/api";

export async function fetchMarketIndicators(): Promise<
  Array<{ label: string; value: string; change: string }>
> {
  try {
    const res = await fetch(`${API_BASE}/market-indicators`);
    if (!res.ok) throw new Error("Failed to fetch market indicators");
    return await res.json();
  } catch {
    return []; // fallback: empty, will use mock
  }
}

export async function fetchStockQuotes(
  symbols: string[]
): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/stocks/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error("Failed to fetch stock quotes");
  return await res.json();
}

export interface CollectResult {
  inserted_count: number;
  total_fetched: number;
  after_dedup: number;
  total_in_db: number;
  regions_queried: number;
  errors: string[];
}

export interface RegionInfo {
  code: string;
  gl: string;
  label: string;
}

export interface RegionCollectResult {
  region: string;
  fetched: number;
  inserted: number;
  total_in_db: number;
  error: string | null;
}

export async function fetchRegions(): Promise<RegionInfo[]> {
  const res = await fetch(`${API_BASE}/news/regions`);
  if (!res.ok) return [];
  return await res.json();
}

export async function collectRegionNews(regionCode: string): Promise<RegionCollectResult> {
  const res = await fetch(`${API_BASE}/news/collect/${regionCode}`, { method: "POST" });
  if (!res.ok) {
    return { region: regionCode, fetched: 0, inserted: 0, total_in_db: 0, error: "요청 실패" };
  }
  return await res.json();
}

export async function collectGlobalNews(): Promise<CollectResult> {
  const res = await fetch(`${API_BASE}/news/collect`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "뉴스 수집 실패");
  }
  return await res.json();
}

export async function fetchBackendNews(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/news`);
  if (!res.ok) throw new Error("Failed to fetch news");
  return await res.json();
}

export async function analyzeNewsWithAI(newsId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/news/${newsId}/analyze`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Analysis failed");
  }
  return await res.json();
}
