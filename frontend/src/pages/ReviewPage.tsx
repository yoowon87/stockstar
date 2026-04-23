import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./_shared";
import {
  currentPeriodKey,
  getReviewByKey,
  listReviews,
  upsertReview,
  type Review,
  type ReviewScope,
} from "../services/reviewApi";

const SCOPES: Array<{ code: ReviewScope; label: string; cadence: string }> = [
  { code: "weekly", label: "주간", cadence: "일요일 · 30분" },
  { code: "monthly", label: "월간", cadence: "월말 · 1시간" },
  { code: "quarterly", label: "분기", cadence: "분기말 · 2시간" },
];

const TEMPLATES: Record<ReviewScope, Array<{ code: string; label: string; placeholder?: string }>> = {
  weekly: [
    { code: "records_review", label: "한 주간 기록 리뷰", placeholder: "어떤 예측이 맞았고 왜 맞았나?" },
    { code: "emotion_check", label: "감정 매매 자기 점검", placeholder: "이번 주 충동 매매 있었나?" },
    { code: "next_deepdive", label: "다음 주 딥다이브 종목", placeholder: "한 종목 선정" },
  ],
  monthly: [
    { code: "index_compare", label: "수익률 vs KOSPI / S&P500 비교", placeholder: "내 수익률 vs 벤치마크" },
    { code: "sector_balance", label: "섹터별 비중 체크 (쏠림 방지)", placeholder: "어느 섹터가 과도한가?" },
    { code: "edge_review", label: "Edge 신규 편입 / 제외 검토", placeholder: "매수할 종목 · 뺄 종목" },
  ],
  quarterly: [
    { code: "three_q_recheck", label: "3가지 질문 전체 포트폴리오 재점검", placeholder: "피셔 프레임 전체 적용" },
    { code: "macro_update", label: "매크로 뷰 업데이트 (금리/환율/경기)", placeholder: "사이클 판단" },
    { code: "yearly_progress", label: "연간 목표 수익률 대비 진행도", placeholder: "목표 대비 %" },
  ],
};

export function ReviewPage() {
  const [scope, setScope] = useState<ReviewScope>("weekly");

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="REVIEW"
        title="주간 / 월간 / 분기 점검"
        subtitle="기록 없는 투자는 도박이다."
      />
      <div className="flex gap-1 px-6" style={{ borderBottom: "1px solid var(--border-default)" }}>
        {SCOPES.map((s) => {
          const active = scope === s.code;
          return (
            <button
              key={s.code}
              onClick={() => setScope(s.code)}
              style={{
                fontFamily: "Outfit",
                fontSize: 12,
                fontWeight: 600,
                padding: "10px 14px",
                color: active ? "var(--gold-bright)" : "var(--text-secondary)",
                background: "transparent",
                borderBottom: active ? "2px solid var(--gold-bright)" : "2px solid transparent",
                cursor: "pointer",
                border: "none",
              }}
            >
              {s.label}{" "}
              <span style={{ fontWeight: 400, fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>
                {s.cadence}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <ScopeView scope={scope} key={scope} />
      </div>
    </div>
  );
}

function ScopeView({ scope }: { scope: ReviewScope }) {
  const [periodKey, setPeriodKey] = useState<string>(currentPeriodKey(scope));
  const [content, setContent] = useState<Record<string, string>>({});
  const [freeNote, setFreeNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Review[]>([]);

  const fields = TEMPLATES[scope];

  function reloadHistory() {
    listReviews(scope, 30).then(setHistory).catch(() => setHistory([]));
  }

  useEffect(() => {
    reloadHistory();
  }, [scope]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSaved(false);
    getReviewByKey(scope, periodKey)
      .then((r) => {
        if (cancelled) return;
        if (r) {
          const { free_note: note = "", ...rest } = r.content;
          setContent(rest);
          setFreeNote(note);
        } else {
          setContent({});
          setFreeNote("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContent({});
          setFreeNote("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, periodKey]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await upsertReview({
        scope,
        period_key: periodKey,
        content: { ...content, free_note: freeNote },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      reloadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label
          style={{
            fontFamily: "Outfit",
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.1em",
          }}
        >
          📅 기간
        </label>
        <input
          type="text"
          value={periodKey}
          onChange={(e) => setPeriodKey(e.target.value)}
          placeholder={placeholderFor(scope)}
          style={{
            fontFamily: "DM Sans",
            fontSize: 13,
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(18, 20, 28, 0.6)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            width: 140,
          }}
        />
        <button
          onClick={() => setPeriodKey(currentPeriodKey(scope))}
          style={{
            fontFamily: "Outfit",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(212, 165, 116, 0.08)",
            border: "1px solid rgba(212, 165, 116, 0.25)",
            color: "var(--gold)",
            cursor: "pointer",
          }}
        >
          현재
        </button>
        {loading && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>불러오는 중…</span>}
      </div>

      {fields.map((f) => (
        <SectionCard key={f.code} title={f.label}>
          <Textarea
            value={content[f.code] ?? ""}
            onChange={(v) => setContent((c) => ({ ...c, [f.code]: v }))}
            placeholder={f.placeholder}
            rows={3}
          />
        </SectionCard>
      ))}

      <SectionCard title="자유 메모">
        <Textarea
          value={freeNote}
          onChange={setFreeNote}
          placeholder="기타 생각"
          rows={3}
        />
      </SectionCard>

      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            fontFamily: "Outfit",
            fontSize: 13,
            fontWeight: 700,
            padding: "10px 20px",
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
            color: "var(--bg-deep)",
            border: "none",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "저장 중…" : "리뷰 저장"}
        </button>
        {saved && <span style={{ color: "var(--up)", fontFamily: "Outfit", fontSize: 12 }}>✓ 저장됨</span>}
        {error && <span style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</span>}
      </div>

      {history.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: "var(--gold)",
              textTransform: "uppercase" as const,
              marginBottom: 8,
            }}
          >
            과거 리뷰
          </div>
          <div className="space-y-2">
            {history.map((r) => (
              <HistoryRow
                key={r.id}
                review={r}
                selected={r.period_key === periodKey}
                onSelect={() => setPeriodKey(r.period_key)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  review,
  selected,
  onSelect,
}: {
  review: Review;
  selected: boolean;
  onSelect: () => void;
}) {
  const summary = Object.entries(review.content)
    .filter(([_, v]) => typeof v === "string" && v.trim())
    .map(([_, v]) => v)
    .slice(0, 1)
    .join(" · ");
  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        background: selected ? "rgba(212, 165, 116, 0.08)" : "rgba(18, 20, 28, 0.6)",
        border: selected ? "1px solid rgba(212, 165, 116, 0.3)" : "1px solid var(--border-default)",
        textAlign: "left" as const,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column" as const,
        gap: 4,
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
          {review.period_key}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
          {new Date(review.updated_at).toLocaleDateString("ko-KR")}
        </span>
      </div>
      {summary && (
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 12,
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summary}
        </div>
      )}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
      }}
    >
      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        fontFamily: "DM Sans",
        fontSize: 13,
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(8, 9, 13, 0.6)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        resize: "vertical",
        outline: "none",
      }}
    />
  );
}

function placeholderFor(scope: ReviewScope): string {
  if (scope === "weekly") return "2026-W17";
  if (scope === "monthly") return "2026-04";
  return "2026-Q2";
}
