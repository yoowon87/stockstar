const API_BASE = "/api";

export interface ThemeStock {
  code: string;
  name: string;
  price: number | null;
  change_pct: number;
  volume: number;
  trade_amount: number;
  market_cap?: number;
}

export interface RadarTheme {
  theme_id: string;
  code: string;
  name: string;
  category: string;
  category_name: string;
  updated_at: string | null;
  total_amount: number;
  avg_change: number;
  rising_ratio: number;
  score: number;
  rank: number | null;
  is_confirmed: boolean;
  leader_code: string | null;
  leader_name: string;
  leader_change: number;
  stocks: ThemeStock[];
}

export interface RadarResponse {
  top: number;
  themes: RadarTheme[];
}

export interface CalendarDay {
  date: string;
  theme_code: string;
  theme_name: string;
  category: string;
  score: number;
  is_confirmed: boolean;
  leader_code: string | null;
  leader_name: string;
  leader_change: number;
}

export interface CalendarResponse {
  start: string;
  end: string;
  days: CalendarDay[];
}

export interface DailyTheme {
  date: string;
  theme_code: string;
  theme_name: string;
  category: string;
  category_name: string;
  rank: number;
  score: number;
  total_amount: number;
  avg_change: number;
  rising_ratio: number;
  is_confirmed: boolean;
  leader_code: string | null;
  leader_name: string;
  leader_change: number;
  rising_stocks: Array<{ code: string; name: string; change: number; trade_amount: number }>;
}

export interface AdminTheme {
  id: string;
  code: string;
  name: string;
  category: string;
  category_name: string;
  description: string | null;
  keywords: string[];
  is_active: boolean;
  display_order: number;
  stock_count: number;
  stocks: Array<{
    theme_id: string;
    stock_code: string;
    stock_name: string;
    is_leader: boolean;
    weight: number;
    note: string | null;
  }>;
}

export interface ThemeDetail {
  theme: AdminTheme;
  stocks: Array<{
    theme_id: string;
    stock_code: string;
    stock_name: string;
    is_leader: boolean;
    weight: number;
    note: string | null;
  }>;
}

export interface ChartCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  code: string;
  count: number;
  candles: ChartCandle[];
  error?: string;
}

export async function getStockChart(stockCode: string, days = 60): Promise<ChartResponse> {
  const res = await fetch(`${API_BASE}/theme/stock/${stockCode}/chart?days=${days}`);
  if (!res.ok) throw new Error("chart fetch failed");
  return res.json();
}

export interface StockSummary {
  code: string;
  price: number | null;
  change_pct: number | null;
  volume: number | null;
  trade_amount: number | null;
  market_cap: number | null;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  roe: number | null;
  debt_ratio: number | null;
  ratio_period: string | null;
}

export async function getStockSummary(stockCode: string): Promise<StockSummary> {
  const res = await fetch(`${API_BASE}/theme/stock/${stockCode}/summary`);
  if (!res.ok) throw new Error("summary fetch failed");
  return res.json();
}

export async function getRadar(top = 10): Promise<RadarResponse> {
  const res = await fetch(`${API_BASE}/theme/radar?top=${top}`);
  if (!res.ok) throw new Error("radar fetch failed");
  return res.json();
}

export async function getCalendar(start: string, end: string): Promise<CalendarResponse> {
  const res = await fetch(`${API_BASE}/theme/calendar?start=${start}&end=${end}`);
  if (!res.ok) throw new Error("calendar fetch failed");
  return res.json();
}

export async function getHistory(date: string, top = 10): Promise<{ date: string; themes: DailyTheme[] }> {
  const res = await fetch(`${API_BASE}/theme/history/${date}?top=${top}`);
  if (!res.ok) throw new Error("history fetch failed");
  return res.json();
}

export async function getThemeByCode(code: string): Promise<ThemeDetail> {
  const res = await fetch(`${API_BASE}/theme/by-code/${code}`);
  if (!res.ok) throw new Error("theme fetch failed");
  return res.json();
}

export async function listAdminThemes(): Promise<{ themes: AdminTheme[] }> {
  const res = await fetch(`${API_BASE}/theme/admin/themes`);
  if (!res.ok) throw new Error("admin list failed");
  return res.json();
}

export async function upsertTheme(payload: Partial<AdminTheme> & { code: string; name: string; category: string; category_name: string }): Promise<AdminTheme> {
  const res = await fetch(`${API_BASE}/theme/admin/themes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("upsert theme failed");
  return res.json();
}

export async function addThemeStock(themeCode: string, stock: { stock_code: string; stock_name: string; is_leader?: boolean; weight?: number; note?: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/theme/admin/themes/${themeCode}/stocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stock),
  });
  if (!res.ok) throw new Error("add stock failed");
}

export async function removeThemeStock(themeCode: string, stockCode: string): Promise<void> {
  const res = await fetch(`${API_BASE}/theme/admin/themes/${themeCode}/stocks/${stockCode}`, { method: "DELETE" });
  if (!res.ok) throw new Error("remove stock failed");
}

// ─── Helpers ───

export function formatKoreanAmount(amount: number): string {
  if (!isFinite(amount) || amount === 0) return "—";
  if (amount >= 1_000_000_000_000) return `${(amount / 1_000_000_000_000).toFixed(2)}조`;
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(0)}억`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}만`;
  return amount.toLocaleString("ko-KR");
}

export function todayStr(d = new Date()): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function monthStartEnd(year: number, month0: number): { start: string; end: string } {
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  return { start: todayStr(start), end: todayStr(end) };
}
