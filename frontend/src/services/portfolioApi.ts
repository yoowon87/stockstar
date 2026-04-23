const API_BASE = "/api";

export type BucketCode = "core" | "edge" | "satellite";

export interface Holding {
  id: number;
  bucket: BucketCode;
  symbol: string;
  label: string;
  shares: number;
  avg_price: number;
  note: string;
  added_at: string;
  updated_at: string;
}

export interface HoldingCreatePayload {
  bucket: BucketCode;
  symbol: string;
  label: string;
  shares: number;
  avg_price: number;
  note: string;
}

export interface HoldingUpdatePayload {
  bucket?: BucketCode;
  label?: string;
  shares?: number;
  avg_price?: number;
  note?: string;
}

export interface HoldingSummary {
  id: number;
  bucket: BucketCode;
  symbol: string;
  label: string;
  shares: number;
  avg_price: number;
  current_price: number | null;
  cost: number;
  value: number;
  pnl: number;
  pnl_pct: number;
  share_of_total_pct: number;
  share_of_bucket_pct: number;
  note: string;
}

export interface BucketSummary {
  code: BucketCode;
  label: string;
  target_pct: number;
  actual_pct: number;
  cost: number;
  value: number;
  pnl: number;
  pnl_pct: number;
  holdings: HoldingSummary[];
}

export interface PortfolioWarning {
  level: "error" | "warn" | "info";
  code: string;
  message: string;
}

export interface PortfolioSummary {
  as_of: string;
  total_cost: number;
  total_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  buckets: BucketSummary[];
  warnings: PortfolioWarning[];
}

export async function listHoldings(): Promise<Holding[]> {
  const res = await fetch(`${API_BASE}/portfolio/holdings`);
  if (!res.ok) throw new Error("보유 종목 조회 실패");
  return res.json();
}

export async function createHolding(payload: HoldingCreatePayload): Promise<Holding> {
  const res = await fetch(`${API_BASE}/portfolio/holdings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "종목 추가 실패");
  }
  return res.json();
}

export async function updateHolding(id: number, payload: HoldingUpdatePayload): Promise<Holding> {
  const res = await fetch(`${API_BASE}/portfolio/holdings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "종목 수정 실패");
  }
  return res.json();
}

export async function deleteHolding(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/portfolio/holdings/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "종목 삭제 실패");
  }
}

export async function getSummary(): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolio/summary`);
  if (!res.ok) throw new Error("포트폴리오 요약 조회 실패");
  return res.json();
}

export function formatKRW(n: number): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`;
  if (abs >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}
