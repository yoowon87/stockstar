import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./_shared";
import {
  deleteEdgeResearch,
  getEdgeResearch,
  listEdgeResearch,
  upsertEdgeResearch,
  type EdgeDecision,
  type EdgeResearch,
} from "../services/edgeApi";

const EDGE_CHECKLIST: Array<{ code: string; label: string }> = [
  { code: "mfg_understood", label: "엔지니어 관점에서 실제 만드는 것이 이해되는가?" },
  { code: "moat", label: "기술 해자가 존재하는가? (특허·양산노하우·고객 락인)" },
  { code: "customers", label: "주요 고객사는? (삼성/SK/LG/글로벌 Tier 1 여부)" },
  { code: "differentiation", label: "경쟁사 대비 기술적 차별점 (판단 가능)" },
  { code: "financials", label: "3개년 매출 성장률 + 영업이익률 추이" },
  { code: "valuation", label: "PER / PBR / PSR 동종업계 평균 대비 위치" },
  { code: "insider", label: "오너 / 대주주 지분율 + 최근 매매 내역" },
  { code: "capex", label: "최근 대규모 CAPEX 공시 (장비 투자 = 수주 신호일 가능)" },
];

const EDGE_SECTORS = [
  "반도체 장비",
  "2차전지 장비",
  "자동화 / 로봇",
  "공장자동화 / 머신비전",
  "기계 / 산업재",
  "기타",
];

const DECISIONS: Array<{ code: EdgeDecision; label: string; color: string; bg: string }> = [
  { code: "pending", label: "검토 중", color: "var(--text-secondary)", bg: "rgba(255,255,255,0.04)" },
  { code: "buy", label: "매수", color: "var(--up)", bg: "rgba(56, 217, 169, 0.1)" },
  { code: "watch", label: "관심", color: "var(--gold-bright)", bg: "rgba(212, 165, 116, 0.1)" },
  { code: "pass", label: "패스", color: "var(--down)", bg: "rgba(244, 77, 93, 0.1)" },
];

type View = { mode: "list" } | { mode: "edit"; symbol: string | null };

export function EdgePage() {
  const [view, setView] = useState<View>({ mode: "list" });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="EDGE"
        title="엔지니어 엣지 영역 — 종목 리서치"
        subtitle="독특함은 남이 무시하는 영역을 끈질기게 파는 것에서 나온다."
        right={
          view.mode === "list" && (
            <button
              onClick={() => setView({ mode: "edit", symbol: null })}
              style={{
                fontFamily: "Outfit",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
                color: "var(--bg-deep)",
                border: "none",
                cursor: "pointer",
              }}
            >
              + 새 리서치
            </button>
          )
        }
      />
      <div className="flex-1 min-h-0 overflow-auto">
        {view.mode === "list" ? (
          <ListView onOpen={(symbol) => setView({ mode: "edit", symbol })} />
        ) : (
          <EditView
            initialSymbol={view.symbol}
            onBack={() => setView({ mode: "list" })}
          />
        )}
      </div>
    </div>
  );
}

// ─────────── List view ───────────

function ListView({ onOpen }: { onOpen: (symbol: string) => void }) {
  const [items, setItems] = useState<EdgeResearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listEdgeResearch()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const byDecision = useMemo(() => {
    const map: Record<EdgeDecision, EdgeResearch[]> = { pending: [], buy: [], watch: [], pass: [] };
    items.forEach((r) => {
      if (map[r.decision]) map[r.decision].push(r);
    });
    return map;
  }, [items]);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-5">
      {/* 섹터 가이드 */}
      <div>
        <SectionTitle>엣지 작동 섹터</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {EDGE_SECTORS.slice(0, 5).map((s) => (
            <div
              key={s}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-subtle)",
                fontFamily: "Outfit",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            padding: 32,
            borderRadius: 12,
            border: "1px dashed var(--border-default)",
            background: "rgba(212, 165, 116, 0.03)",
            textAlign: "center" as const,
            fontFamily: "DM Sans",
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.7,
          }}
        >
          아직 리서치 기록이 없습니다.
          <br />
          상단 <b style={{ color: "var(--gold-bright)" }}>+ 새 리서치</b>에서 첫 종목을 등록하세요.
        </div>
      ) : (
        <>
          {(["buy", "watch", "pending", "pass"] as EdgeDecision[]).map((d) =>
            byDecision[d].length > 0 ? (
              <DecisionGroup
                key={d}
                decision={d}
                items={byDecision[d]}
                onOpen={onOpen}
              />
            ) : null,
          )}
        </>
      )}
    </div>
  );
}

function DecisionGroup({
  decision,
  items,
  onOpen,
}: {
  decision: EdgeDecision;
  items: EdgeResearch[];
  onOpen: (symbol: string) => void;
}) {
  const meta = DECISIONS.find((d) => d.code === decision)!;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            fontFamily: "Outfit",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            padding: "3px 10px",
            borderRadius: 999,
            background: meta.bg,
            border: `1px solid ${meta.color}`,
            color: meta.color,
          }}
        >
          {meta.label.toUpperCase()}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>{items.length}종목</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((r) => (
          <ResearchCard key={r.symbol} research={r} onOpen={() => onOpen(r.symbol)} />
        ))}
      </div>
    </div>
  );
}

function ResearchCard({ research, onOpen }: { research: EdgeResearch; onOpen: () => void }) {
  const checked = Object.values(research.checklist).filter(Boolean).length;
  return (
    <button
      onClick={onOpen}
      style={{
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
        textAlign: "left" as const,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column" as const,
        gap: 6,
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
          {research.label || research.symbol}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
          {research.symbol}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {research.sector && (
          <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--gold)" }}>{research.sector}</span>
        )}
        <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
          체크리스트 {checked}/{EDGE_CHECKLIST.length}
        </span>
      </div>
      {research.decision_note && (
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
          {research.decision_note}
        </div>
      )}
    </button>
  );
}

// ─────────── Edit view ───────────

function EditView({ initialSymbol, onBack }: { initialSymbol: string | null; onBack: () => void }) {
  const [loading, setLoading] = useState<boolean>(!!initialSymbol);
  const [symbol, setSymbol] = useState("");
  const [label, setLabel] = useState("");
  const [sector, setSector] = useState(EDGE_SECTORS[0]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [checklistNotes, setChecklistNotes] = useState<Record<string, string>>({});
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [decision, setDecision] = useState<EdgeDecision>("pending");
  const [decisionNote, setDecisionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const existing = !!initialSymbol;

  useEffect(() => {
    if (!initialSymbol) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getEdgeResearch(initialSymbol)
      .then((r) => {
        if (!r) return;
        setSymbol(r.symbol);
        setLabel(r.label);
        setSector(r.sector || EDGE_SECTORS[0]);
        setChecklist(r.checklist);
        setChecklistNotes(r.checklist_notes);
        setQ1(r.q1_answer);
        setQ2(r.q2_answer);
        setQ3(r.q3_answer);
        setDecision(r.decision);
        setDecisionNote(r.decision_note);
      })
      .finally(() => setLoading(false));
  }, [initialSymbol]);

  const checkedCount = useMemo(
    () => EDGE_CHECKLIST.filter((c) => checklist[c.code]).length,
    [checklist],
  );

  async function handleSave() {
    if (!symbol.trim() || !label.trim()) {
      setError("종목명과 심볼은 필수입니다.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await upsertEdgeResearch({
        symbol: symbol.trim(),
        label: label.trim(),
        sector,
        checklist,
        checklist_notes: checklistNotes,
        q1_answer: q1,
        q2_answer: q2,
        q3_answer: q3,
        decision,
        decision_note: decisionNote,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialSymbol) return;
    setDeleting(true);
    try {
      await deleteEdgeResearch(initialSymbol);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="p-6" style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
      <button
        onClick={onBack}
        style={{
          fontFamily: "Outfit",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        ← 리스트로
      </button>

      {/* 기본 정보 */}
      <SectionCard title="기본 정보">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <LabeledInput label="종목명" value={label} onChange={setLabel} placeholder="예: 한미반도체" />
          <LabeledInput
            label="심볼 (Yahoo)"
            value={symbol}
            onChange={setSymbol}
            placeholder="예: 042700.KS"
            disabled={existing}
          />
        </div>
        <div>
          <Label>섹터</Label>
          <div className="flex flex-wrap gap-2">
            {EDGE_SECTORS.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: sector === s ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
                  border: sector === s ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
                  color: sector === s ? "var(--gold-bright)" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* 체크리스트 */}
      <SectionCard
        title={`종목 분석 체크리스트 (${checkedCount}/${EDGE_CHECKLIST.length})`}
        hint="엔지니어 관점"
      >
        <div className="space-y-2">
          {EDGE_CHECKLIST.map((item) => (
            <ChecklistRow
              key={item.code}
              label={item.label}
              checked={!!checklist[item.code]}
              onToggle={() => setChecklist((c) => ({ ...c, [item.code]: !c[item.code] }))}
              note={checklistNotes[item.code] ?? ""}
              onNoteChange={(v) => setChecklistNotes((n) => ({ ...n, [item.code]: v }))}
            />
          ))}
        </div>
      </SectionCard>

      {/* 3가지 질문 */}
      <SectionCard title="3가지 질문 (피셔 프레임)">
        <QuestionField
          n={1}
          prompt="이 종목에 대해 시장이 믿는 것 중 틀린 건 무엇인가?"
          value={q1}
          onChange={setQ1}
        />
        <QuestionField
          n={2}
          prompt="남들이 이해 못 하지만 내(엔지니어)가 이해할 수 있는 건 무엇인가?"
          value={q2}
          onChange={setQ2}
        />
        <QuestionField
          n={3}
          prompt="지금 내 뇌는 어떤 편향에 빠져있나? (확증편향 / 앵커링 / 손실회피)"
          value={q3}
          onChange={setQ3}
        />
      </SectionCard>

      {/* 결정 */}
      <SectionCard title="투자 결정">
        <div className="flex gap-2 flex-wrap mb-3">
          {DECISIONS.map((d) => {
            const active = decision === d.code;
            return (
              <button
                key={d.code}
                onClick={() => setDecision(d.code)}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: active ? d.bg : "rgba(255,255,255,0.02)",
                  border: active ? `1px solid ${d.color}` : "1px solid var(--border-subtle)",
                  color: active ? d.color : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        <Textarea
          value={decisionNote}
          onChange={setDecisionNote}
          placeholder="결론 노트 — 주요 근거, 진입 조건, 손절선"
          rows={3}
        />
      </SectionCard>

      <div className="flex items-center gap-3 pb-4 flex-wrap">
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
          {saving ? "저장 중…" : existing ? "업데이트" : "리서치 저장"}
        </button>
        {existing && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              fontFamily: "Outfit",
              fontSize: 12,
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(244, 77, 93, 0.06)",
              border: "1px solid rgba(244, 77, 93, 0.25)",
              color: "var(--down)",
              cursor: "pointer",
            }}
          >
            삭제
          </button>
        )}
        {confirmDelete && (
          <>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                fontFamily: "Outfit",
                fontSize: 12,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                background: "var(--down)",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              {deleting ? "삭제 중…" : "삭제 확인"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                fontFamily: "Outfit",
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </>
        )}
        {saved && <span style={{ color: "var(--up)", fontFamily: "Outfit", fontSize: 12 }}>✓ 저장됨</span>}
        {error && <span style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</span>}
      </div>
    </div>
  );
}

// ─────────── Atoms ───────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
      }}
    >
      <div className="flex items-baseline gap-2 mb-3">
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{title}</span>
        {hint && (
          <span
            style={{
              fontFamily: "Outfit",
              fontSize: 9,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "rgba(255,255,255,0.04)",
              padding: "2px 6px",
              borderRadius: 4,
              letterSpacing: "0.08em",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "Outfit",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-muted)",
        letterSpacing: "0.12em",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%",
          fontFamily: "DM Sans",
          fontSize: 13,
          padding: "8px 12px",
          borderRadius: 8,
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(8, 9, 13, 0.6)",
          border: "1px solid var(--border-subtle)",
          color: disabled ? "var(--text-muted)" : "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}

function ChecklistRow({
  label,
  checked,
  onToggle,
  note,
  onNoteChange,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  note: string;
  onNoteChange: (s: string) => void;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: checked ? "rgba(56, 217, 169, 0.04)" : "rgba(255,255,255,0.02)",
        border: checked ? "1px solid rgba(56, 217, 169, 0.25)" : "1px solid var(--border-subtle)",
      }}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          style={{
            accentColor: "var(--up)",
            width: 18,
            height: 18,
            marginTop: 2,
            cursor: "pointer",
          }}
        />
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: 13,
            color: checked ? "var(--text-primary)" : "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {label}
        </span>
      </label>
      <input
        type="text"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="메모 (선택)"
        style={{
          width: "100%",
          marginTop: 8,
          fontFamily: "DM Sans",
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(8, 9, 13, 0.6)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
    </div>
  );
}

function QuestionField({
  n,
  prompt,
  value,
  onChange,
}: {
  n: number;
  prompt: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div
        style={{
          fontFamily: "Outfit",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--gold-bright)",
          marginBottom: 2,
        }}
      >
        Q{n}
      </div>
      <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.5 }}>
        {prompt}
      </div>
      <Textarea value={value} onChange={onChange} placeholder="—" rows={2} />
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
