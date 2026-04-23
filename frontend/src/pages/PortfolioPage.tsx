import { useEffect, useState } from "react";
import { PageHeader } from "./_shared";
import {
  createHolding,
  deleteHolding,
  formatKRW,
  getSummary,
  type BucketCode,
  type BucketSummary,
  type HoldingCreatePayload,
  type HoldingSummary,
  type PortfolioSummary,
  type PortfolioWarning,
} from "../services/portfolioApi";

const BUCKET_DESCRIPTIONS: Record<BucketCode, string> = {
  core: "고민 없이 시장 평균을 확보하는 장치",
  edge: "엔지니어 전문성을 자본으로 바꾸는 장치",
  satellite: "실수해도 되는 놀이터",
};

const BUCKET_COLORS: Record<BucketCode, string> = {
  core: "var(--blue)",
  edge: "var(--gold-bright)",
  satellite: "var(--teal)",
};

export function PortfolioPage() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  function reload() {
    setLoading(true);
    setError("");
    getSummary()
      .then((s) => setSummary(s))
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const hasHoldings = !!summary && summary.buckets.some((b) => b.holdings.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="PORTFOLIO"
        title="3-Bucket 자산 배분"
        subtitle="Core 65% · Edge 28% · Satellite 7% — 실시간 평가액과 룰 체커"
        right={
          <button
            onClick={() => setShowAddForm((v) => !v)}
            style={{
              fontFamily: "Outfit",
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              background: showAddForm ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, var(--gold), var(--gold-bright))",
              color: showAddForm ? "var(--text-secondary)" : "var(--bg-deep)",
              border: showAddForm ? "1px solid var(--border-default)" : "none",
              cursor: "pointer",
            }}
          >
            {showAddForm ? "취소" : "+ 종목 추가"}
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-5xl mx-auto w-full space-y-4">
        {showAddForm && (
          <AddHoldingForm
            onCancel={() => setShowAddForm(false)}
            onSaved={() => {
              setShowAddForm(false);
              reload();
            }}
          />
        )}

        {loading && !summary && (
          <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>
            평가액 계산 중… (Yahoo Finance 시세 조회)
          </div>
        )}
        {error && (
          <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 13 }}>
            {error}
          </div>
        )}

        {summary && (
          <>
            <TotalCard summary={summary} />
            <WarningList warnings={summary.warnings} />
            {!hasHoldings && !showAddForm && (
              <EmptyHint onAdd={() => setShowAddForm(true)} />
            )}
            {summary.buckets.map((b) => (
              <BucketCard key={b.code} bucket={b} onChanged={reload} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────── Top-level cards ───────────

function TotalCard({ summary }: { summary: PortfolioSummary }) {
  const pnlColor = summary.total_pnl >= 0 ? "var(--up)" : "var(--down)";
  const asOf = new Date(summary.as_of).toLocaleString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 14,
        background: "linear-gradient(135deg, rgba(212, 165, 116, 0.08), rgba(18, 20, 28, 0.6))",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em" }}>
            총 평가액
          </div>
          <div
            style={{
              fontFamily: "Outfit",
              fontWeight: 800,
              fontSize: 36,
              color: "var(--text-primary)",
              marginTop: 2,
            }}
          >
            {formatKRW(summary.total_value)}
            <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 8, fontWeight: 500 }}>원</span>
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 20, color: pnlColor }}>
            {summary.total_pnl >= 0 ? "+" : ""}
            {formatKRW(summary.total_pnl)}원
          </div>
          <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: pnlColor, marginTop: 2 }}>
            {summary.total_pnl_pct >= 0 ? "+" : ""}
            {summary.total_pnl_pct.toFixed(2)}%
          </div>
          <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
            원가 {formatKRW(summary.total_cost)}원 · {asOf}
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningList({ warnings }: { warnings: PortfolioWarning[] }) {
  if (warnings.length === 0) return null;
  const order: Record<string, number> = { error: 0, warn: 1, info: 2 };
  const sorted = [...warnings].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <div className="space-y-2">
      {sorted.map((w, i) => (
        <WarningRow key={i} warning={w} />
      ))}
    </div>
  );
}

function WarningRow({ warning }: { warning: PortfolioWarning }) {
  const map = {
    error: { bg: "rgba(244, 77, 93, 0.08)", bd: "rgba(244, 77, 93, 0.35)", fg: "var(--down)", icon: "🔴" },
    warn: { bg: "rgba(212, 165, 116, 0.08)", bd: "rgba(212, 165, 116, 0.3)", fg: "var(--gold-bright)", icon: "🟡" },
    info: { bg: "rgba(56, 130, 246, 0.06)", bd: "rgba(56, 130, 246, 0.2)", fg: "var(--blue)", icon: "🔵" },
  }[warning.level];
  return (
    <div
      className="flex items-start gap-3"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: map.bg,
        border: `1px solid ${map.bd}`,
        fontFamily: "DM Sans",
        fontSize: 13,
        color: map.fg,
      }}
    >
      <span>{map.icon}</span>
      <span style={{ lineHeight: 1.5 }}>{warning.message}</span>
    </div>
  );
}

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
        아직 보유 종목이 없습니다. 상단 <b>“+ 종목 추가”</b>에서 시작하세요.
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
        <b>초기 6개월 룰:</b> Edge 배정액의 30~50%만 투입 · 나머지는 CMA 현금 대기
        <br />
        공부가 쌓이기 전에 꽉 채우면, 진짜 기회 왔을 때 실탄이 없다.
      </div>
      <button
        onClick={onAdd}
        className="mt-3"
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
        첫 종목 추가
      </button>
    </div>
  );
}

// ─────────── Bucket card ───────────

function BucketCard({ bucket, onChanged }: { bucket: BucketSummary; onChanged: () => void }) {
  const color = BUCKET_COLORS[bucket.code];
  const desc = BUCKET_DESCRIPTIONS[bucket.code];
  const pnlColor = bucket.pnl >= 0 ? "var(--up)" : "var(--down)";

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
            {bucket.label}
          </span>
          <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>{desc}</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>
            목표 {bucket.target_pct.toFixed(0)}%
          </span>
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 20, color }}>
            {bucket.actual_pct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          marginBottom: 10,
          position: "relative",
        }}
      >
        <div style={{ width: `${Math.min(bucket.actual_pct, 100)}%`, height: "100%", background: color }} />
        <div
          style={{
            position: "absolute",
            left: `${bucket.target_pct}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: "rgba(255,255,255,0.4)",
          }}
        />
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <MiniKV label="평가액" value={`${formatKRW(bucket.value)}원`} />
        <MiniKV label="원가" value={`${formatKRW(bucket.cost)}원`} />
        <MiniKV
          label="손익"
          value={`${bucket.pnl >= 0 ? "+" : ""}${formatKRW(bucket.pnl)}원 (${bucket.pnl_pct >= 0 ? "+" : ""}${bucket.pnl_pct.toFixed(2)}%)`}
          color={pnlColor}
        />
      </div>

      {bucket.holdings.length === 0 ? (
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)", padding: "12px 0" }}>
          보유 종목 없음
        </div>
      ) : (
        <HoldingsTable holdings={bucket.holdings} onChanged={onChanged} />
      )}
    </div>
  );
}

function MiniKV({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontFamily: "Outfit", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.12em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: color ?? "var(--text-primary)", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function HoldingsTable({ holdings, onChanged }: { holdings: HoldingSummary[]; onChanged: () => void }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "DM Sans", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 10, letterSpacing: "0.1em" }}>
            <Th align="left">종목</Th>
            <Th align="right">수량</Th>
            <Th align="right">평단</Th>
            <Th align="right">현재가</Th>
            <Th align="right">평가액</Th>
            <Th align="right">손익</Th>
            <Th align="right">전체 %</Th>
            <Th align="right"> </Th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <HoldingRow key={h.id} h={h} onChanged={onChanged} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "8px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function HoldingRow({ h, onChanged }: { h: HoldingSummary; onChanged: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pnlColor = h.pnl >= 0 ? "var(--up)" : "var(--down)";

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteHolding(h.id);
      onChanged();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  return (
    <tr style={{ color: "var(--text-primary)" }}>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ fontWeight: 600 }}>{h.label || h.symbol}</div>
        {h.label && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{h.symbol}</div>}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>
        {h.shares.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>
        {h.avg_price.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>
        {h.current_price != null ? h.current_price.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "—"}
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right", fontWeight: 600 }}>
        {formatKRW(h.value)}
      </td>
      <td
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border-subtle)",
          textAlign: "right",
          color: pnlColor,
          fontWeight: 600,
        }}
      >
        {h.pnl >= 0 ? "+" : ""}
        {h.pnl_pct.toFixed(2)}%
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right", color: "var(--text-muted)" }}>
        {h.share_of_total_pct.toFixed(1)}%
      </td>
      <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", textAlign: "right" }}>
        {confirmDelete ? (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                fontFamily: "Outfit",
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 5,
                background: "var(--down)",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              {deleting ? "…" : "확인"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                fontFamily: "Outfit",
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 5,
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-secondary)",
                border: "none",
                cursor: "pointer",
              }}
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              fontFamily: "Outfit",
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 5,
              background: "rgba(244, 77, 93, 0.08)",
              border: "1px solid rgba(244, 77, 93, 0.25)",
              color: "var(--down)",
              cursor: "pointer",
            }}
          >
            삭제
          </button>
        )}
      </td>
    </tr>
  );
}

// ─────────── Add Holding Form ───────────

function AddHoldingForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [bucket, setBucket] = useState<BucketCode>("core");
  const [symbol, setSymbol] = useState("");
  const [label, setLabel] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!symbol.trim() || !shares.trim() || !avgPrice.trim()) {
      setError("심볼, 수량, 평단은 필수입니다.");
      return;
    }
    const s = parseFloat(shares);
    const p = parseFloat(avgPrice);
    if (!isFinite(s) || s <= 0 || !isFinite(p) || p < 0) {
      setError("수량은 양수, 평단은 0 이상이어야 합니다.");
      return;
    }
    const payload: HoldingCreatePayload = {
      bucket,
      symbol: symbol.trim(),
      label: label.trim(),
      shares: s,
      avg_price: p,
      note,
    };
    setSaving(true);
    setError("");
    try {
      await createHolding(payload);
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
        새 종목 추가
      </div>

      <div className="mb-3">
        <Label>버킷</Label>
        <div className="flex gap-2">
          {(["core", "edge", "satellite"] as BucketCode[]).map((b) => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              style={{
                fontFamily: "Outfit",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 999,
                background: bucket === b ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
                border: bucket === b ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
                color: bucket === b ? "var(--gold-bright)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {b === "core" ? "Core" : b === "edge" ? "Edge" : "Satellite"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <Label>종목명</Label>
          <TextInput value={label} onChange={setLabel} placeholder="예: 삼성전자" />
        </div>
        <div>
          <Label>심볼 (Yahoo)</Label>
          <TextInput value={symbol} onChange={setSymbol} placeholder="예: 005930.KS, VOO" />
        </div>
        <div>
          <Label>수량</Label>
          <TextInput value={shares} onChange={setShares} placeholder="예: 10" type="number" />
        </div>
        <div>
          <Label>평단가</Label>
          <TextInput value={avgPrice} onChange={setAvgPrice} placeholder="예: 75000" type="number" />
        </div>
      </div>

      <div className="mb-3">
        <Label>메모 (선택)</Label>
        <TextInput value={note} onChange={setNote} placeholder="매수 근거, 손절선 등" />
      </div>

      {error && (
        <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12, marginBottom: 8 }}>{error}</div>
      )}

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
          {saving ? "저장 중…" : "저장"}
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

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step="any"
      style={{
        width: "100%",
        fontFamily: "DM Sans",
        fontSize: 13,
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(8, 9, 13, 0.6)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        outline: "none",
      }}
    />
  );
}
