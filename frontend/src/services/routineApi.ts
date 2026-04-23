const API_BASE = "/api";

export interface RoutineLog {
  date: string;
  morning_done: boolean;
  lunch_done: boolean;
  evening_done: boolean;
  note: string;
  updated_at: string;
}

export interface RoutineLogInput {
  morning_done: boolean;
  lunch_done: boolean;
  evening_done: boolean;
  note: string;
}

export async function getRoutine(date: string): Promise<RoutineLog> {
  const res = await fetch(`${API_BASE}/routine/${date}`);
  if (!res.ok) throw new Error("루틴 조회 실패");
  return res.json();
}

export async function saveRoutine(date: string, payload: RoutineLogInput): Promise<RoutineLog> {
  const res = await fetch(`${API_BASE}/routine/${date}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("루틴 저장 실패");
  return res.json();
}
