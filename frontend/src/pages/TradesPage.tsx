import { useEffect, useState } from "react";
import { PageHeader } from "./_shared";
import {
  createTrade,
  deleteTrade,
  listTrades,
  todayStr,
  updateTrade,
  type TradeAction,
  type TradeLog,
  type TradeLogInput,
} from "../services/tradesApi";

const ACTIONS: Array<{ code: TradeAction; label: string; color: string; bg: string }> = [
  { code: "buy", label: "매수", color: "var(--up)", bg: "rgba(56, 217, 169, 0.12)" },
  { code: "add", label: "추가매수", color: "var(--up)", bg: "rgba(56, 217, 169, 0.12)" },
  { code: "sell", label: "매도", color: "var(--down)", bg: "rgba(244, 77, 93, 0.12)" },
  { code: "trim", label: "분할매도", color: "var(--down)", bg: "rgba(244, 77, 93, 0.12)" },
  { code: "watch", label: "관망", color: "var(--text-secondary)", bg: "rgba(255,255,255,0.05)" },
];

const EMOTIONS = ["냉정", "불안", "흥분", "의기소침", "확신", "후회"];

function actionMeta(code: TradeAction) {
  return ACTIONS.find((a) => a.code === code) ?? ACTIONS[0];
}

function emptyForm(): TradeLogInput {
  return {
    date: todayStr(),
    symbol: "",
    label: "",
    action: "buy",
    reason: "",
    emotion: "",
    lesson: "",
  };
}

export function TradesPage() {
  const [items, setItems] = useState<TradeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TradeLog | null>(null);

  function reload() {
    setLoading(true);
    listTrades(100)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }
  function openEdit(t: TradeLog) {
    setEditing(t);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="TRADES"
        title="매매일지"
        subtitle="왜 샀고 왜 팔았는지 — 숫자가 아니라 이유를 남긴다."
        right={
          !showForm && (
            <button
              onClick={openNew}
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
              + 매매 기록
            </button>
          )
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-4">
        {showForm && (
          <TradeForm
            initial={editing}
            onCancel={closeForm}
            onSaved={() => {
              closeForm();
              reload();
            }}
          />
        )}

        {loading ? (
          <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>
        ) : items.length === 0 && !showForm ? (
          <EmptyHint onAdd={openNew} />
        ) : (
          <div className="space-y-3">
            {items.map((t) => (
              <TradeCard key={t.id} trade={t} onEdit={() => openEdit(t)} onChanged={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── Empty ───────────

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        padding: 40,
        borderRadius: 14,
        border: "1px dashed var(--border-default)",
        background: "rgba(212, 165, 116, 0.03)",
        textAlign: "center" as const,
        fontFamily: "DM Sans",
      }}
    >
      <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>
        아직 매매 기록이 없습니다. 상단 <b>“+ 매매 기록”</b>에서 시작하세요.
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        체결 직후, <b>“왜 이 결정을 했는가”</b>를 한 줄이라도 남겨두면<br />
        나중에 같은 실수를 반복하는지 확인할 수 있다.
      </div>
      <button
        onClick={onAdd}
        style={{
          fontFamily: "Outfit",
          fontSize: 12,
          fontWeight: 700,
          padding: "8px 16px",
          borderRadius: 10,
          background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
          color: "var(--bg-deep)",
          border: "none",
          cursor: "pointer",
          marginTop: 14,
        }}
      >
        첫 기록 추가
      </button>
    </div>
  );
}

// ─────────── Card ───────────

function TradeCard({ trade, onEdit, onChanged }: { trade: TradeLog; onEdit: () => void; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = actionMeta(trade.action);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTrade(trade.id);
      onChanged();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>{trade.date}</span>
          <span
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 9px",
              borderRadius: 999,
              background: meta.bg,
              border: `1px solid ${meta.color}`,
              color: meta.color,
              letterSpacing: "0.05em",
            }}
          >
            {meta.label}
          </span>
          {(trade.label || trade.symbol) && (
            <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              {trade.label || trade.symbol}
            </span>
          )}
          {!open && trade.reason && (
            <span
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--text-muted)",
                maxWidth: 320,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trade.reason}
            </span>
          )}
        </div>
        <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border-default)", padding: "12px 16px 16px" }} className="space-y-3">
          {trade.symbol && (
            <DetailLine label="심볼" value={trade.symbol} />
          )}
          <DetailLine label="이유" value={trade.reason || "—"} />
          {trade.emotion && <DetailLine label="감정" value={trade.emotion} />}
          {trade.lesson && <DetailLine label="교훈" value={trade.lesson} />}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onEdit}
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 8,
                background: "rgba(56, 130, 246, 0.08)",
                border: "1px solid rgba(56, 130, 246, 0.3)",
                color: "var(--blue)",
                cursor: "pointer",
              }}
            >
              수정
            </button>
            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: 8,
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
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  취소
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: 8,
                  background: "rgba(244, 77, 93, 0.06)",
                  border: "1px solid rgba(244, 77, 93, 0.25)",
                  color: "var(--down)",
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────── Form ───────────

function TradeForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: TradeLog | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TradeLogInput>(
    initial
      ? {
          date: initial.date,
          symbol: initial.symbol,
          label: initial.label,
          action: initial.action,
          reason: initial.reason,
          emotion: initial.emotion,
          lesson: initial.lesson,
        }
      : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function patch(p: Partial<TradeLogInput>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function handleSave() {
    if (!form.date.trim()) {
      setError("날짜는 필수입니다.");
      return;
    }
    if (!form.reason.trim()) {
      setError("이유는 한 줄이라도 남겨주세요.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (initial) {
        await updateTrade(initial.id, form);
      } else {
        await createTrade(form);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        background: "rgba(212, 165, 116, 0.04)",
        border: "1px solid rgba(212, 165, 116, 0.2)",
      }}
    >
      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "var(--gold-bright)", marginBottom: 12 }}>
        {initial ? "매매 기록 수정" : "새 매매 기록"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <Label>날짜</Label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => patch({ date: e.target.value })}
            style={inputStyle({ colorScheme: "dark" })}
          />
        </div>
        <div>
          <Label>종목명</Label>
          <TextInput value={form.label} onChange={(v) => patch({ label: v })} placeholder="예: 한미반도체" />
        </div>
        <div>
          <Label>심볼 (선택)</Label>
          <TextInput value={form.symbol} onChange={(v) => patch({ symbol: v })} placeholder="예: 042700.KS" />
        </div>
      </div>

      <div className="mb-3">
        <Label>매매 구분</Label>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => {
            const active = form.action === a.code;
            return (
              <button
                key={a.code}
                onClick={() => patch({ action: a.code })}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 999,
                  background: active ? a.bg : "rgba(255,255,255,0.02)",
                  border: active ? `1px solid ${a.color}` : "1px solid var(--border-subtle)",
                  color: active ? a.color : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <Label>이유 — 왜 이 결정을 했나? (핵심)</Label>
        <Textarea
          value={form.reason}
          onChange={(v) => patch({ reason: v })}
          placeholder="진입/청산 근거, 본 시그널, 기대 시나리오…"
          rows={4}
        />
      </div>

      <div className="mb-3">
        <Label>감정 (선택)</Label>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map((e) => {
            const active = form.emotion === e;
            return (
              <button
                key={e}
                onClick={() => patch({ emotion: active ? "" : e })}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: active ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
                  border: active ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
                  color: active ? "var(--gold-bright)" : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <Label>교훈 (선택)</Label>
        <Textarea
          value={form.lesson}
          onChange={(v) => patch({ lesson: v })}
          placeholder="이 매매에서 배운 것 한 줄"
          rows={2}
        />
      </div>

      {error && <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            fontFamily: "Outfit",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
            color: "var(--bg-deep)",
            border: "none",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "저장 중…" : initial ? "수정 저장" : "저장"}
        </button>
        <button
          onClick={onCancel}
          style={{
            fontFamily: "Outfit",
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
            cursor: "pointer",
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

// ─────────── Atoms ───────────

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</div>
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

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: "100%",
    fontFamily: "DM Sans",
    fontSize: 13,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(8, 9, 13, 0.6)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
    outline: "none",
    ...extra,
  };
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle()}
    />
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
      style={{ ...inputStyle(), padding: "10px 12px", resize: "vertical" }}
    />
  );
}
