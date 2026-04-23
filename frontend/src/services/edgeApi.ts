const API_BASE = "/api";

export type EdgeDecision = "pending" | "buy" | "watch" | "pass";

export interface EdgeResearch {
  symbol: string;
  label: string;
  sector: string;
  checklist: Record<string, boolean>;
  checklist_notes: Record<string, string>;
  q1_answer: string;
  q2_answer: string;
  q3_answer: string;
  decision: EdgeDecision;
  decision_note: string;
  created_at: string;
  updated_at: string;
}

export interface EdgeResearchInput {
  symbol: string;
  label: string;
  sector: string;
  checklist: Record<string, boolean>;
  checklist_notes: Record<string, string>;
  q1_answer: string;
  q2_answer: string;
  q3_answer: string;
  decision: EdgeDecision;
  decision_note: string;
}

export async function listEdgeResearch(): Promise<EdgeResearch[]> {
  const res = await fetch(`${API_BASE}/edge/research`);
  if (!res.ok) throw new Error("엣지 리서치 조회 실패");
  return res.json();
}

export async function getEdgeResearch(symbol: string): Promise<EdgeResearch | null> {
  const res = await fetch(`${API_BASE}/edge/research/${encodeURIComponent(symbol)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("리서치 조회 실패");
  return res.json();
}

export async function upsertEdgeResearch(payload: EdgeResearchInput): Promise<EdgeResearch> {
  const res = await fetch(`${API_BASE}/edge/research`, {
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

export async function deleteEdgeResearch(symbol: string): Promise<void> {
  const res = await fetch(`${API_BASE}/edge/research/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("삭제 실패");
}
