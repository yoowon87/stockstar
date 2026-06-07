const API_BASE = "/api";

export type TradeAction = "buy" | "add" | "sell" | "trim" | "watch";

export interface TradeLog {
  id: number;
  date: string;
  symbol: string;
  label: string;
  action: TradeAction;
  reason: string;
  emotion: string;
  lesson: string;
  created_at: string;
  updated_at: string;
}

export interface TradeLogInput {
  date: string;
  symbol: string;
  label: string;
  action: TradeAction;
  reason: string;
  emotion: string;
  lesson: string;
}

export async function listTrades(limit = 100): Promise<TradeLog[]> {
  const res = await fetch(`${API_BASE}/trades?limit=${limit}`);
  if (!res.ok) throw new Error("매매일지 조회 실패");
  return res.json();
}

export async function createTrade(payload: TradeLogInput): Promise<TradeLog> {
  const res = await fetch(`${API_BASE}/trades`, {
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

export async function updateTrade(
  id: number,
  patch: Partial<TradeLogInput>,
): Promise<TradeLog> {
  const res = await fetch(`${API_BASE}/trades/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "수정 실패");
  }
  return res.json();
}

export async function deleteTrade(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/trades/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("삭제 실패");
}

export function todayStr(d = new Date()): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
