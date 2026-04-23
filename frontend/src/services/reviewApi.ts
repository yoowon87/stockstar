const API_BASE = "/api";

export type ReviewScope = "weekly" | "monthly" | "quarterly";

export interface Review {
  id: number;
  scope: ReviewScope;
  period_key: string;
  content: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ReviewInput {
  scope: ReviewScope;
  period_key: string;
  content: Record<string, string>;
}

export async function listReviews(scope?: ReviewScope, limit = 30): Promise<Review[]> {
  const qs = new URLSearchParams();
  if (scope) qs.set("scope", scope);
  qs.set("limit", String(limit));
  const res = await fetch(`${API_BASE}/reviews?${qs.toString()}`);
  if (!res.ok) throw new Error("리뷰 조회 실패");
  return res.json();
}

export async function getReviewByKey(scope: ReviewScope, periodKey: string): Promise<Review | null> {
  const res = await fetch(
    `${API_BASE}/reviews/by-key?scope=${scope}&period_key=${encodeURIComponent(periodKey)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("리뷰 조회 실패");
  return res.json();
}

export async function upsertReview(payload: ReviewInput): Promise<Review> {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "리뷰 저장 실패");
  }
  return res.json();
}

export async function deleteReview(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/reviews/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("리뷰 삭제 실패");
}

/** ISO week of date (YYYY-Www). Thursday of the week is used for week-year. */
export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function quarterKey(d = new Date()): string {
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-Q${q}`;
}

export function currentPeriodKey(scope: ReviewScope, d = new Date()): string {
  if (scope === "weekly") return isoWeekKey(d);
  if (scope === "monthly") return monthKey(d);
  return quarterKey(d);
}
