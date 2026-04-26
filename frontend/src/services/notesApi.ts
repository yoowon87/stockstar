const API_BASE = "/api";

export type NoteType = "news_analysis" | "memo" | "observation";
export type StockRole = "beneficiary" | "victim" | "mention";
export type VerificationStatus = "pending" | "verified_hit" | "verified_miss" | "expired";

export interface NoteStock {
  stock_code: string;
  stock_name: string;
  role: StockRole;
  confidence: number | null;
  rationale: string | null;
  price_at_note: number | null;
  price_after_1d: number | null;
  price_after_7d: number | null;
  price_after_30d: number | null;
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  source_url: string | null;
  source_name: string | null;
  source_excerpt: string | null;
  published_at: string | null;
  analysis_result: any | null;
  action_window_start: string | null;
  action_window_until: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  stocks: NoteStock[];
}

export interface NoteCreatePayload {
  type: NoteType;
  title: string;
  content?: string;
  source_url?: string | null;
  source_name?: string | null;
  source_excerpt?: string | null;
  published_at?: string | null;
  analysis_result?: any;
  action_window_start?: string | null;
  action_window_until?: string | null;
  tags: string[];
  stocks: Omit<NoteStock, "price_after_1d" | "price_after_7d" | "price_after_30d">[];
}

export interface NoteListFilters {
  q?: string;
  tag?: string;
  stock_code?: string;
  type?: NoteType;
  verification?: VerificationStatus;
  limit?: number;
}

export interface DailyUsage {
  date: string | null;
  haiku_calls: number;
  haiku_passed: number;
  sonnet_calls: number;
  cost_krw: number;
}

export interface AnalyzePayload {
  url?: string;
  text?: string;
}

export interface AnalyzeResult {
  stage1?: {
    korea_impact: string;
    sector: string;
    worth_full_analysis: string;
    reason: string;
  };
  triage_pass?: boolean;
  stage2?: any;
  stage2_error?: string;
  cost_krw?: number;
  article_excerpt?: string;
  error?: string;
}

export async function listNotes(filters: NoteListFilters = {}): Promise<{ notes: Note[]; count: number }> {
  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const res = await fetch(`${API_BASE}/notes?${qs.toString()}`);
  if (!res.ok) throw new Error("notes list failed");
  return res.json();
}

export async function getNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`);
  if (!res.ok) throw new Error("note fetch failed");
  return res.json();
}

export async function createNote(payload: NoteCreatePayload): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "노트 저장 실패");
  }
  return res.json();
}

export async function updateNote(id: string, patch: Partial<NoteCreatePayload> & { verification_status?: VerificationStatus }): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("노트 수정 실패");
  return res.json();
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("노트 삭제 실패");
}

export async function getTags(): Promise<{ tags: { tag: string; count: number }[] }> {
  const res = await fetch(`${API_BASE}/notes/tags`);
  if (!res.ok) throw new Error("tags fetch failed");
  return res.json();
}

export async function getNotesByStock(stockCode: string): Promise<{ stock_code: string; notes: any[] }> {
  const res = await fetch(`${API_BASE}/notes/by-stock/${encodeURIComponent(stockCode)}`);
  if (!res.ok) throw new Error("notes-by-stock fetch failed");
  return res.json();
}

export async function getTodayUsage(): Promise<DailyUsage> {
  const res = await fetch(`${API_BASE}/notes/usage/today`);
  if (!res.ok) throw new Error("usage fetch failed");
  return res.json();
}

export async function analyzeNews(payload: AnalyzePayload): Promise<AnalyzeResult> {
  const res = await fetch(`${API_BASE}/notes/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "분석 실패");
  }
  return res.json();
}

// ─── helpers ───

export function verificationBadge(status: VerificationStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case "verified_hit": return { label: "✅ 적중", color: "var(--up)", bg: "rgba(56, 217, 169, 0.1)" };
    case "verified_miss": return { label: "❌ 실패", color: "var(--down)", bg: "rgba(244, 77, 93, 0.1)" };
    case "expired": return { label: "⌛ 만료", color: "var(--text-muted)", bg: "rgba(255,255,255,0.04)" };
    default: return { label: "⏳ 대기", color: "var(--blue)", bg: "rgba(56, 130, 246, 0.1)" };
  }
}

export function pctChange(start: number | null, end: number | null): number | null {
  if (start == null || end == null || start === 0) return null;
  return ((end - start) / start) * 100;
}
