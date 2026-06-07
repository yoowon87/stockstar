import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./_shared";
import {
  deleteAnalysis,
  getAnalysis,
  listAnalyses,
  upsertAnalysis,
  type FinancialRow,
  type StockAnalysis,
  type StockAnalysisInput,
  type Verdict,
} from "../services/analysisApi";

const VERDICTS: Array<{ code: Verdict; label: string; color: string; bg: string }> = [
  { code: "gem", label: "옥 (우량)", color: "var(--up)", bg: "rgba(56, 217, 169, 0.1)" },
  { code: "watch", label: "관심", color: "var(--gold-bright)", bg: "rgba(212, 165, 116, 0.1)" },
  { code: "pending", label: "보류", color: "var(--text-secondary)", bg: "rgba(255,255,255,0.04)" },
  { code: "reject", label: "석 (제외)", color: "var(--down)", bg: "rgba(244, 77, 93, 0.1)" },
];

const SECTORS = [
  "반도체 소부장",
  "반도체 후공정",
  "2차전지",
  "디스플레이",
  "자동차 부품",
  "바이오/제약",
  "조선/기계",
  "기타",
];

function verdictMeta(code: Verdict) {
  return VERDICTS.find((v) => v.code === code) ?? VERDICTS[2];
}

function fmtPrice(p: number | null): string {
  if (p == null) return "—";
  return p.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

const MAX_IMAGE_DIM = 1280; // 긴 변 최대 픽셀 — 업로드 시 자동 축소

/** 이미지 파일을 캔버스로 축소해 JPEG data URL로 변환 (DB 저장 용량 절감). */
function fileToDownscaledDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("이미지 해석 실패"));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("캔버스 생성 실패"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type View = { mode: "list" } | { mode: "edit"; symbol: string | null };

export function AnalysisPage() {
  const [view, setView] = useState<View>({ mode: "list" });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="ANALYSIS"
        title="종목분석"
        subtitle="바닥주 옥석 가리기 — 사업·실적·차트를 한 장에."
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
              + 새 분석
            </button>
          )
        }
      />
      <div className="flex-1 min-h-0 overflow-auto">
        {view.mode === "list" ? (
          <ListView onOpen={(symbol) => setView({ mode: "edit", symbol })} />
        ) : (
          <EditView initialSymbol={view.symbol} onBack={() => setView({ mode: "list" })} />
        )}
      </div>
    </div>
  );
}

// ─────────── List view ───────────

function ListView({ onOpen }: { onOpen: (symbol: string) => void }) {
  const [items, setItems] = useState<StockAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listAnalyses()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const byVerdict = useMemo(() => {
    const map: Record<Verdict, StockAnalysis[]> = { gem: [], watch: [], pending: [], reject: [] };
    items.forEach((a) => {
      if (map[a.verdict]) map[a.verdict].push(a);
    });
    return map;
  }, [items]);

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-5">
      {loading ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중… (현재가 조회)</div>
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
          아직 분석한 종목이 없습니다.
          <br />
          상단 <b style={{ color: "var(--gold-bright)" }}>+ 새 분석</b>에서 바닥주 후보를 등록하세요.
        </div>
      ) : (
        (["gem", "watch", "pending", "reject"] as Verdict[]).map((v) =>
          byVerdict[v].length > 0 ? (
            <VerdictGroup key={v} verdict={v} items={byVerdict[v]} onOpen={onOpen} />
          ) : null,
        )
      )}
    </div>
  );
}

function VerdictGroup({
  verdict,
  items,
  onOpen,
}: {
  verdict: Verdict;
  items: StockAnalysis[];
  onOpen: (symbol: string) => void;
}) {
  const meta = verdictMeta(verdict);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          style={{
            fontFamily: "Outfit",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            padding: "3px 10px",
            borderRadius: 999,
            background: meta.bg,
            border: `1px solid ${meta.color}`,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>{items.length}종목</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((a) => (
          <AnalysisCard key={a.symbol} analysis={a} onOpen={() => onOpen(a.symbol)} />
        ))}
      </div>
    </div>
  );
}

function AnalysisCard({ analysis, onOpen }: { analysis: StockAnalysis; onOpen: () => void }) {
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
          {analysis.label || analysis.symbol}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>{analysis.symbol}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {analysis.sector && (
          <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--gold)" }}>{analysis.sector}</span>
        )}
        <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-secondary)" }}>
          현재가 {fmtPrice(analysis.current_price)}
        </span>
        {analysis.per != null && (
          <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>PER {analysis.per}</span>
        )}
        {analysis.has_chart_image && (
          <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>📷 차트</span>
        )}
      </div>
      {(analysis.memo || analysis.business) && (
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 12,
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {analysis.memo || analysis.business}
        </div>
      )}
    </button>
  );
}

// ─────────── Edit view ───────────

function emptyFinancialRow(year = ""): FinancialRow {
  return { year, revenue: null, operating_profit: null, net_income: null };
}

function EditView({ initialSymbol, onBack }: { initialSymbol: string | null; onBack: () => void }) {
  const [loading, setLoading] = useState<boolean>(!!initialSymbol);
  const [symbol, setSymbol] = useState("");
  const [label, setLabel] = useState("");
  const [sector, setSector] = useState(SECTORS[0]);
  const [business, setBusiness] = useState("");
  const [financials, setFinancials] = useState<FinancialRow[]>([
    emptyFinancialRow(),
    emptyFinancialRow(),
    emptyFinancialRow(),
  ]);
  const [per, setPer] = useState("");
  const [pbr, setPbr] = useState("");
  const [debtRatio, setDebtRatio] = useState("");
  const [chartMemo, setChartMemo] = useState("");
  const [chartImage, setChartImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [memo, setMemo] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("pending");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
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
    getAnalysis(initialSymbol)
      .then((a) => {
        if (!a) return;
        setSymbol(a.symbol);
        setLabel(a.label);
        setSector(a.sector || SECTORS[0]);
        setBusiness(a.business);
        setFinancials(a.financials.length > 0 ? a.financials : [emptyFinancialRow()]);
        setPer(a.per == null ? "" : String(a.per));
        setPbr(a.pbr == null ? "" : String(a.pbr));
        setDebtRatio(a.debt_ratio == null ? "" : String(a.debt_ratio));
        setChartMemo(a.chart_memo);
        setChartImage(a.chart_image || "");
        setMemo(a.memo);
        setVerdict(a.verdict);
        setCurrentPrice(a.current_price);
      })
      .finally(() => setLoading(false));
  }, [initialSymbol]);

  function updateFinancial(i: number, patch: Partial<FinancialRow>) {
    setFinancials((arr) => arr.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addFinancialRow() {
    setFinancials((arr) => [...arr, emptyFinancialRow()]);
  }
  function removeFinancialRow(i: number) {
    setFinancials((arr) => arr.filter((_, idx) => idx !== i));
  }

  function num(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  async function handleImagePick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 올릴 수 있습니다.");
      return;
    }
    setImageError("");
    setImageLoading(true);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      setChartImage(dataUrl);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "이미지 처리 실패");
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSave() {
    if (!symbol.trim() || !label.trim()) {
      setError("종목명과 심볼은 필수입니다.");
      return;
    }
    setError("");
    setSaving(true);
    const payload: StockAnalysisInput = {
      symbol: symbol.trim(),
      label: label.trim(),
      sector,
      business,
      financials: financials.filter(
        (r) => r.year.trim() || r.revenue != null || r.operating_profit != null || r.net_income != null,
      ),
      per: num(per),
      pbr: num(pbr),
      debt_ratio: num(debtRatio),
      chart_memo: chartMemo,
      chart_image: chartImage,
      memo,
      verdict,
    };
    try {
      const result = await upsertAnalysis(payload);
      setCurrentPrice(result.current_price);
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
      await deleteAnalysis(initialSymbol);
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
        <div className="flex items-center gap-4 flex-wrap mb-3">
          <div>
            <Label>현재가 (자동)</Label>
            <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
              {fmtPrice(currentPrice)}
              {currentPrice == null && existing && (
                <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                  시세 조회 실패
                </span>
              )}
              {!existing && (
                <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                  저장 후 자동 표시
                </span>
              )}
            </div>
          </div>
        </div>
        <div>
          <Label>섹터 / 테마</Label>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
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

      {/* 사업 내용 */}
      <SectionCard title="이 기업은 무슨 일을 하는가">
        <Textarea
          value={business}
          onChange={setBusiness}
          placeholder="주력 제품/서비스, 매출 구성, 전방 산업, 주요 고객사…"
          rows={4}
        />
      </SectionCard>

      {/* 최근 실적 */}
      <SectionCard title="최근 실적 (연도별)" hint="매출 · 영업이익 · 순이익">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "DM Sans", fontSize: 12 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 10, letterSpacing: "0.1em" }}>
                <Th align="left">연도</Th>
                <Th align="right">매출</Th>
                <Th align="right">영업이익</Th>
                <Th align="right">순이익</Th>
                <Th align="right"> </Th>
              </tr>
            </thead>
            <tbody>
              {financials.map((row, i) => (
                <tr key={i}>
                  <td style={cellStyle}>
                    <CellInput
                      value={row.year}
                      onChange={(v) => updateFinancial(i, { year: v })}
                      placeholder="2025"
                      align="left"
                    />
                  </td>
                  <td style={cellStyle}>
                    <CellNumber value={row.revenue} onChange={(v) => updateFinancial(i, { revenue: v })} />
                  </td>
                  <td style={cellStyle}>
                    <CellNumber
                      value={row.operating_profit}
                      onChange={(v) => updateFinancial(i, { operating_profit: v })}
                    />
                  </td>
                  <td style={cellStyle}>
                    <CellNumber value={row.net_income} onChange={(v) => updateFinancial(i, { net_income: v })} />
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>
                    {financials.length > 1 && (
                      <button
                        onClick={() => removeFinancialRow(i)}
                        style={{
                          fontFamily: "Outfit",
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 6,
                          background: "rgba(244, 77, 93, 0.08)",
                          border: "1px solid rgba(244, 77, 93, 0.3)",
                          color: "var(--down)",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addFinancialRow}
          style={{
            fontFamily: "Outfit",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--blue)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginTop: 8,
            padding: 0,
          }}
        >
          + 연도 추가
        </button>
        <div style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          단위는 자유(억원 등). 흑자전환·성장 추세를 한눈에 보기 위한 기록.
        </div>
      </SectionCard>

      {/* 펀더멘털 */}
      <SectionCard title="펀더멘털" hint="수동 입력">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <LabeledInput label="PER" value={per} onChange={setPer} placeholder="예: 8.5" type="number" />
          <LabeledInput label="PBR" value={pbr} onChange={setPbr} placeholder="예: 0.7" type="number" />
          <LabeledInput label="부채비율 (%)" value={debtRatio} onChange={setDebtRatio} placeholder="예: 45" type="number" />
        </div>
      </SectionCard>

      {/* 차트 분석 */}
      <SectionCard title="차트 분석" hint="직접 작성">
        <Textarea
          value={chartMemo}
          onChange={setChartMemo}
          placeholder="지지/저항, 추세, 거래량, 바닥 패턴, 본인이 본 신호…"
          rows={4}
        />

        <div className="mt-3">
          <Label>차트 이미지 (선택)</Label>
          {chartImage ? (
            <div
              style={{
                position: "relative",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
                background: "rgba(8, 9, 13, 0.6)",
              }}
            >
              <img
                src={chartImage}
                alt="차트 분석"
                style={{ display: "block", width: "100%", maxHeight: 480, objectFit: "contain" }}
              />
              <button
                onClick={() => setChartImage("")}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontFamily: "Outfit",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(8, 9, 13, 0.8)",
                  border: "1px solid rgba(244, 77, 93, 0.4)",
                  color: "var(--down)",
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          ) : (
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "28px 16px",
                borderRadius: 10,
                border: "1px dashed var(--border-default)",
                background: "rgba(255,255,255,0.02)",
                cursor: imageLoading ? "wait" : "pointer",
                textAlign: "center" as const,
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleImagePick(e.target.files?.[0]);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
              <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                {imageLoading ? "처리 중…" : "＋ 차트 이미지 올리기"}
              </span>
              <span style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)" }}>
                직접 만든 차트 캡처를 올리세요 · 자동 축소(최대 {MAX_IMAGE_DIM}px)
              </span>
            </label>
          )}
          {imageError && (
            <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12, marginTop: 6 }}>{imageError}</div>
          )}
        </div>
      </SectionCard>

      {/* 종합 메모 + 판정 */}
      <SectionCard title="종합 메모 & 옥석 판정">
        <Textarea
          value={memo}
          onChange={setMemo}
          placeholder="결론 — 옥인가 석인가, 진입 조건, 리스크"
          rows={3}
        />
        <div className="flex gap-2 flex-wrap mt-3">
          {VERDICTS.map((v) => {
            const active = verdict === v.code;
            return (
              <button
                key={v.code}
                onClick={() => setVerdict(v.code)}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: active ? v.bg : "rgba(255,255,255,0.02)",
                  border: active ? `1px solid ${v.color}` : "1px solid var(--border-subtle)",
                  color: active ? v.color : "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
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
          {saving ? "저장 중…" : existing ? "업데이트" : "분석 저장"}
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

const cellStyle: React.CSSProperties = {
  padding: "4px 6px",
  borderBottom: "1px solid var(--border-subtle)",
};

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th style={{ textAlign: align, padding: "8px 6px", borderBottom: "1px solid var(--border-subtle)", fontWeight: 600 }}>
      {children}
    </th>
  );
}

function CellInput({
  value,
  onChange,
  placeholder,
  align = "right",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  align?: "left" | "right";
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        fontFamily: "DM Sans",
        fontSize: 12,
        padding: "6px 8px",
        borderRadius: 6,
        background: "rgba(8, 9, 13, 0.6)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        outline: "none",
        textAlign: align,
      }}
    />
  );
}

function CellNumber({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      step="any"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value.trim() ? parseFloat(e.target.value) : null)}
      placeholder="—"
      style={{
        width: "100%",
        fontFamily: "DM Sans",
        fontSize: 12,
        padding: "6px 8px",
        borderRadius: 6,
        background: "rgba(8, 9, 13, 0.6)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-primary)",
        outline: "none",
        textAlign: "right",
      }}
    />
  );
}

function SectionCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        step={type === "number" ? "any" : undefined}
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
