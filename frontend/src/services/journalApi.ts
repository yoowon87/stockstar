const API_BASE = "/api";

export type Direction = "up" | "flat" | "down";
export type MarketTemp = "cold" | "warm" | "hot";

export interface StockForecast {
  id: number;
  symbol: string;
  label: string;
  current_price: number | null;
  predicted_direction: Direction;
  rationale: string;
  actual_direction: Direction | null;
  actual_pct: number | null;
  is_correct: boolean | null;
}

export interface StockForecastInput {
  symbol: string;
  label: string;
  current_price: number | null;
  predicted_direction: Direction;
  rationale: string;
}

export interface Prediction {
  id: number;
  date: string;
  market_temp: MarketTemp;
  today_thoughts: string;
  news_observation: string;
  kospi_current: number | null;
  kospi_forecast_1w: number | null;
  kospi_rationale: string;
  kospi_counter_reason: string;
  emotion_state: string;
  impulse_note: string;
  verified_at: string | null;
  lesson: string;
  created_at: string;
  stock_forecasts: StockForecast[];
}

export interface PredictionCreatePayload {
  date: string;
  market_temp: MarketTemp;
  today_thoughts: string;
  news_observation: string;
  kospi_current: number | null;
  kospi_forecast_1w: number | null;
  kospi_rationale: string;
  kospi_counter_reason: string;
  emotion_state: string;
  impulse_note: string;
  stock_forecasts: StockForecastInput[];
}

export interface StockOutcome {
  forecast_id: number;
  actual_direction: Direction;
  actual_pct: number | null;
}

export interface DirectionStat {
  count: number;
  correct: number;
  pct: number;
}

export interface MonthlyStats {
  month: string;
  total_predictions: number;
  total_stock_forecasts: number;
  correct: number;
  wrong: number;
  accuracy_pct: number;
  by_direction: Record<string, DirectionStat>;
}

export async function createPrediction(payload: PredictionCreatePayload): Promise<Prediction> {
  const res = await fetch(`${API_BASE}/journal/predictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "예측 저장 실패");
  }
  return res.json();
}

export async function getPredictionByDate(date: string): Promise<Prediction | null> {
  const res = await fetch(`${API_BASE}/journal/predictions/by-date/${date}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("예측 조회 실패");
  return res.json();
}

export async function listPredictions(limit = 30): Promise<Prediction[]> {
  const res = await fetch(`${API_BASE}/journal/predictions?limit=${limit}`);
  if (!res.ok) throw new Error("예측 리스트 조회 실패");
  return res.json();
}

export async function verifyPrediction(
  id: number,
  lesson: string,
  outcomes: StockOutcome[],
): Promise<Prediction> {
  const res = await fetch(`${API_BASE}/journal/predictions/${id}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lesson, outcomes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "검증 저장 실패");
  }
  return res.json();
}

export async function getMonthlyStats(month: string): Promise<MonthlyStats> {
  const res = await fetch(`${API_BASE}/journal/stats?month=${month}`);
  if (!res.ok) throw new Error("통계 조회 실패");
  return res.json();
}

export function todayStr(d = new Date()): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function currentMonthStr(d = new Date()): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}
