const API_BASE = "/api";

export type Verdict = "pending" | "gem" | "watch" | "reject";

export interface FinancialRow {
  year: string;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
}

export interface StockAnalysis {
  symbol: string;
  label: string;
  sector: string;
  business: string;
  financials: FinancialRow[];
  per: number | null;
  pbr: number | null;
  debt_ratio: number | null;
  chart_memo: string;
  chart_image: string;
  has_chart_image: boolean;
  memo: string;
  verdict: Verdict;
  current_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface StockAnalysisInput {
  symbol: string;
  label: string;
  sector: string;
  business: string;
  financials: FinancialRow[];
  per: number | null;
  pbr: number | null;
  debt_ratio: number | null;
  chart_memo: string;
  chart_image: string;
  memo: string;
  verdict: Verdict;
}

export async function listAnalyses(): Promise<StockAnalysis[]> {
  const res = await fetch(`${API_BASE}/analysis`);
  if (!res.ok) throw new Error("종목분석 조회 실패");
  return res.json();
}

export async function getAnalysis(symbol: string): Promise<StockAnalysis | null> {
  const res = await fetch(`${API_BASE}/analysis/${encodeURIComponent(symbol)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("분석 조회 실패");
  return res.json();
}

export async function upsertAnalysis(payload: StockAnalysisInput): Promise<StockAnalysis> {
  const res = await fetch(`${API_BASE}/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "저장 실패");
  }
  return res.json();
}

export async function deleteAnalysis(symbol: string): Promise<void> {
  const res = await fetch(`${API_BASE}/analysis/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("삭제 실패");
}
