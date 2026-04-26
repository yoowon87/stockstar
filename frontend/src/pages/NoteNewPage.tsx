import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  analyzeNews,
  createNote,
  getTodayUsage,
  type AnalyzeResult,
  type NoteCreatePayload,
  type NoteType,
  type StockRole,
} from "../services/notesApi";

interface StockRow {
  stock_code: string;
  stock_name: string;
  role: StockRole;
  confidence: number;
  rationale: string;
}

const TYPE_OPTIONS: Array<{ code: NoteType; label: string; desc: string }> = [
  { code: "news_analysis", label: "뉴스 분석", desc: "외부 기사 + 영향 분석" },
  { code: "memo", label: "메모", desc: "자유 메모/단상" },
  { code: "observation", label: "관찰", desc: "현장 관찰/체감" },
];

const ROLE_OPTIONS: Array<{ code: StockRole; label: string; color: string }> = [
  { code: "beneficiary", label: "수혜", color: "var(--up)" },
  { code: "victim", label: "피해", color: "var(--down)" },
  { code: "mention", label: "언급", color: "var(--text-secondary)" },
];

const WINDOW_PRESETS = [
  { label: "24시간", hours: 24 },
  { label: "48시간", hours: 48 },
  { label: "1주일", hours: 24 * 7 },
  { label: "중장기", hours: null },
];

function emptyStock(): StockRow {
  return { stock_code: "", stock_name: "", role: "beneficiary", confidence: 3, rationale: "" };
}

export function NoteNewPage() {
  const navigate = useNavigate();

  const [type, setType] = useState<NoteType>("news_analysis");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [stocks, setStocks] = useState<StockRow[]>([emptyStock()]);
  const [windowUntil, setWindowUntil] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [stage1, setStage1] = useState<AnalyzeResult["stage1"] | null>(null);
  const [costInfo, setCostInfo] = useState<{ today: number; lastCall: number | null }>({ today: 0, lastCall: null });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTodayUsage().then((u) => setCostInfo((c) => ({ ...c, today: u.cost_krw }))).catch(() => {});
  }, []);

  function setWindow(hours: number | null) {
    if (hours === null) {
      setWindowUntil(null);
      return;
    }
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setWindowUntil(d.toISOString());
  }

  function updateStock(i: number, patch: Partial<StockRow>) {
    setStocks((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addStock() {
    setStocks((arr) => [...arr, emptyStock()]);
  }
  function removeStock(i: number) {
    setStocks((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function runClaude() {
    if (!url.trim() && !content.trim()) {
      setAnalyzeMsg("URL 또는 본문 중 하나는 입력해주세요.");
      return;
    }
    if (!confirm(`Claude 2단계 분석을 호출합니다.\n\n1단계 Haiku (분류)  → 약 21원\n2단계 Sonnet (분석)  → 통과 시 추가 67원\n\n진행할까요?`)) {
      return;
    }
    setAnalyzing(true);
    setAnalyzeMsg("");
    setError("");
    try {
      const res = await analyzeNews({ url: url.trim() || undefined, text: content.trim() || undefined });
      if (res.error) {
        setError(res.error);
        return;
      }
      setStage1(res.stage1 ?? null);
      setCostInfo((c) => ({ today: c.today + (res.cost_krw ?? 0), lastCall: res.cost_krw ?? null }));

      if (!res.triage_pass) {
        setAnalyzeMsg(`1단계 통과 X — ${res.stage1?.reason || "분석 가치 낮음"}. 본인 메모로만 저장 권장.`);
        return;
      }

      if (res.stage2_error || !res.stage2) {
        setAnalyzeMsg("2단계 실패: " + (res.stage2_error || "결과 없음"));
        return;
      }

      const a = res.stage2;
      setAnalysisResult(a);
      if (a.summary && !title) setTitle(a.summary);
      if (a.tags && !tagsInput) setTagsInput((a.tags as string[]).join(", "));
      if (res.article_excerpt && !sourceExcerpt) setSourceExcerpt(res.article_excerpt);

      const beneficiaries = [...(a.directBeneficiaries || []), ...(a.indirectBeneficiaries || [])];
      const victims = a.victims || [];
      const newStocks: StockRow[] = [
        ...beneficiaries.map((s: any): StockRow => ({
          stock_code: s.code || "",
          stock_name: s.name || "",
          role: "beneficiary",
          confidence: s.confidence ?? 3,
          rationale: s.rationale || "",
        })),
        ...victims.map((s: any): StockRow => ({
          stock_code: s.code || "",
          stock_name: s.name || "",
          role: "victim",
          confidence: s.confidence ?? 3,
          rationale: s.rationale || "",
        })),
      ].filter((s) => s.stock_code && s.stock_name);

      if (newStocks.length > 0) setStocks(newStocks);

      const dur = a.actionWindow?.duration as string | undefined;
      if (dur === "24시간") setWindow(24);
      else if (dur === "48시간") setWindow(48);
      else if (dur === "1주일") setWindow(24 * 7);

      setAnalyzeMsg(`✓ Claude 분석 완료. 결과 검토 후 본인 코멘트 추가하고 저장하세요.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("제목은 필수입니다.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const tags = tagsInput.split(/[,#]/).map((t) => t.trim()).filter(Boolean);
      const payload: NoteCreatePayload = {
        type,
        title: title.trim(),
        content: content.trim(),
        source_url: url.trim() || null,
        source_name: sourceName.trim() || null,
        source_excerpt: sourceExcerpt.trim() || null,
        tags,
        analysis_result: analysisResult,
        action_window_until: windowUntil,
        stocks: stocks
          .filter((s) => s.stock_code.trim() && s.stock_name.trim())
          .map((s) => ({
            stock_code: s.stock_code.trim(),
            stock_name: s.stock_name.trim(),
            role: s.role,
            confidence: s.confidence || null,
            rationale: s.rationale.trim() || null,
            price_at_note: null,
          })),
      };
      const saved = await createNote(payload);
      navigate(`/notes/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="📝 NEW NOTE"
        title="새 분석 / 메모 작성"
        subtitle="본인 사고가 먼저, AI는 검증·보완"
        right={<button onClick={() => navigate("/notes")} style={btnSec}>← 목록</button>}
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-3xl mx-auto w-full space-y-4">
        <Card title="① 종류">
          <div className="flex gap-2 flex-wrap">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.code}
                onClick={() => setType(t.code)}
                style={{
                  ...chipBtn,
                  background: type === t.code ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
                  borderColor: type === t.code ? "rgba(212, 165, 116, 0.5)" : "var(--border-subtle)",
                  color: type === t.code ? "var(--gold-bright)" : "var(--text-secondary)",
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="② 출처 URL (선택)">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            style={input}
          />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              onClick={runClaude}
              disabled={analyzing}
              style={{
                ...btnSec,
                background: "linear-gradient(135deg, rgba(56, 130, 246, 0.2), rgba(212, 165, 116, 0.15))",
                color: "var(--gold-bright)",
                border: "1px solid rgba(212, 165, 116, 0.4)",
                fontWeight: 700,
              }}
            >
              {analyzing ? "🤖 분석 중…" : "🤖 Claude 분석 (Haiku→Sonnet)"}
            </button>
            <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
              Haiku 21원 → 통과 시 Sonnet 67원 추가
            </span>
            <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-secondary)", marginLeft: "auto" }}>
              오늘 사용액: <b style={{ color: "var(--gold-bright)" }}>{costInfo.today.toFixed(0)}원</b>
            </span>
          </div>
          {analyzeMsg && (
            <div style={{ marginTop: 8, fontFamily: "DM Sans", fontSize: 12, color: "var(--gold-bright)" }}>
              {analyzeMsg}
            </div>
          )}
          {stage1 && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 8,
                background: "rgba(56, 130, 246, 0.06)",
                border: "1px solid rgba(56, 130, 246, 0.25)",
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <b>1단계 Haiku 결과:</b> 한국 영향 {stage1.korea_impact} · 분야 {stage1.sector || "—"} · 분석 가치 {stage1.worth_full_analysis} — {stage1.reason}
            </div>
          )}
        </Card>

        <Card title="③ 제목">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="한 줄 요약" style={input} />
        </Card>

        <Card title="④ 본문 / 내 코멘트">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="본인 사고를 먼저 적어두세요. AI 분석은 보조."
            rows={6}
            style={textarea}
          />
        </Card>

        <Card title="⑤ 출처 (선택)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="출처명 (예: Reuters)" style={input} />
            <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="태그 (콤마 구분: 반도체, HBM)" style={input} />
          </div>
          <textarea
            value={sourceExcerpt}
            onChange={(e) => setSourceExcerpt(e.target.value)}
            placeholder="원문 발췌 (선택)"
            rows={3}
            style={{ ...textarea, marginTop: 8 }}
          />
        </Card>

        <Card title="⑥ 관련 종목" action={{ label: "+ 종목 추가", onClick: addStock }}>
          <div className="space-y-2">
            {stocks.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                }}
                className="flex items-start gap-2 flex-wrap"
              >
                <input value={s.stock_code} onChange={(e) => updateStock(i, { stock_code: e.target.value })} placeholder="코드" style={{ ...input, width: 90 }} />
                <input value={s.stock_name} onChange={(e) => updateStock(i, { stock_name: e.target.value })} placeholder="종목명" style={{ ...input, width: 140 }} />
                <select value={s.role} onChange={(e) => updateStock(i, { role: e.target.value as StockRole })} style={{ ...input, width: 90 }}>
                  {ROLE_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                </select>
                <select value={s.confidence} onChange={(e) => updateStock(i, { confidence: Number(e.target.value) })} style={{ ...input, width: 90 }}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"⭐".repeat(n)}</option>)}
                </select>
                <input value={s.rationale} onChange={(e) => updateStock(i, { rationale: e.target.value })} placeholder="논리 (한 문장)" style={{ ...input, flex: 1, minWidth: 160 }} />
                {stocks.length > 1 && (
                  <button onClick={() => removeStock(i)} style={{ ...btnSec, color: "var(--down)" }}>×</button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="⑦ 시간 윈도우 (진입 가능 만료)">
          <div className="flex gap-2 flex-wrap">
            {WINDOW_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setWindow(p.hours)}
                style={{
                  ...chipBtn,
                  padding: "6px 12px",
                  background: (windowUntil && p.hours) || (!windowUntil && p.hours === null)
                    ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
                  color: (windowUntil && p.hours) || (!windowUntil && p.hours === null)
                    ? "var(--gold-bright)" : "var(--text-secondary)",
                }}
              >
                {p.label}
              </button>
            ))}
            {windowUntil && (
              <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)", alignSelf: "center" }}>
                만료 {new Date(windowUntil).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>
        </Card>

        {analysisResult && (
          <Card title="🤖 Claude 분석 결과 (참고)">
            <pre
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 11,
                color: "var(--text-muted)",
                background: "rgba(8, 9, 13, 0.6)",
                padding: 10,
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 280,
              }}
            >
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </Card>
        )}

        <div className="flex items-center gap-3 pb-6 flex-wrap">
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
            {saving ? "저장 중…" : "💾 저장"}
          </button>
          {error && <span style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "rgba(18, 20, 28, 0.6)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>{title}</span>
        {action && (
          <button onClick={action.onClick} style={{ fontFamily: "Outfit", fontSize: 11, fontWeight: 600, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

const input: React.CSSProperties = {
  fontFamily: "DM Sans",
  fontSize: 13,
  padding: "8px 12px",
  borderRadius: 8,
  background: "rgba(8, 9, 13, 0.6)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
  outline: "none",
  width: "100%",
};

const textarea: React.CSSProperties = {
  fontFamily: "DM Sans",
  fontSize: 13,
  padding: "10px 12px",
  borderRadius: 8,
  background: "rgba(8, 9, 13, 0.6)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
  outline: "none",
  resize: "vertical" as const,
  width: "100%",
};

const chipBtn: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--border-subtle)",
  cursor: "pointer",
  textAlign: "left" as const,
};

const btnSec: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-default)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};
