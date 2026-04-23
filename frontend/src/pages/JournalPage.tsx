import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./_shared";
import {
  createPrediction,
  currentMonthStr,
  getMonthlyStats,
  getPredictionByDate,
  listPredictions,
  todayStr,
  verifyPrediction,
  type Direction,
  type MarketTemp,
  type MonthlyStats,
  type Prediction,
  type StockForecast,
  type StockForecastInput,
  type StockOutcome,
} from "../services/journalApi";

type Tab = "today" | "history" | "stats";

const MARKET_TEMPS: Array<{ code: MarketTemp; label: string }> = [
  { code: "cold", label: "차가움" },
  { code: "warm", label: "미지근" },
  { code: "hot", label: "뜨거움" },
];

const EMOTIONS = ["냉정", "불안", "흥분", "의기소침"];

const DEFAULT_SLOTS: StockForecastInput[] = [
  { symbol: "005930.KS", label: "삼성전자", current_price: null, predicted_direction: "flat", rationale: "" },
  { symbol: "000660.KS", label: "SK하이닉스", current_price: null, predicted_direction: "flat", rationale: "" },
  { symbol: "009150.KS", label: "삼성전기", current_price: null, predicted_direction: "flat", rationale: "" },
  { symbol: "", label: "", current_price: null, predicted_direction: "flat", rationale: "" },
];

export function JournalPage() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="JOURNAL"
        title="예측 & 회고"
        subtitle="매일 예측을 쓰고, 다음날 검증하면 1년에 240개의 예측 데이터가 쌓인다."
      />
      <div className="flex gap-1 px-6" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <TabBtn active={tab === "today"} onClick={() => setTab("today")}>오늘 예측</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>히스토리 / 검증</TabBtn>
        <TabBtn active={tab === "stats"} onClick={() => setTab("stats")}>월간 적중률</TabBtn>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === "today" && <TodayTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "stats" && <StatsTab />}
      </div>
    </div>
  );
}

// ─────────── Today Tab ───────────

function TodayTab() {
  const [date, setDate] = useState<string>(todayStr());
  const [marketTemp, setMarketTemp] = useState<MarketTemp>("warm");
  const [todayThoughts, setTodayThoughts] = useState("");
  const [newsObservation, setNewsObservation] = useState("");
  const [kospiCurrent, setKospiCurrent] = useState<string>("");
  const [kospiForecast, setKospiForecast] = useState<string>("");
  const [kospiRationale, setKospiRationale] = useState("");
  const [kospiCounter, setKospiCounter] = useState("");
  const [emotion, setEmotion] = useState("");
  const [impulseNote, setImpulseNote] = useState("");
  const [forecasts, setForecasts] = useState<StockForecastInput[]>(DEFAULT_SLOTS);
  const [existing, setExisting] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSaved(false);
    getPredictionByDate(date)
      .then((p) => {
        if (cancelled) return;
        if (p) {
          setExisting(p);
          setMarketTemp(p.market_temp);
          setTodayThoughts(p.today_thoughts);
          setNewsObservation(p.news_observation);
          setKospiCurrent(p.kospi_current == null ? "" : String(p.kospi_current));
          setKospiForecast(p.kospi_forecast_1w == null ? "" : String(p.kospi_forecast_1w));
          setKospiRationale(p.kospi_rationale);
          setKospiCounter(p.kospi_counter_reason);
          setEmotion(p.emotion_state);
          setImpulseNote(p.impulse_note);
          setForecasts(
            p.stock_forecasts.length > 0
              ? p.stock_forecasts.map((f) => ({
                  symbol: f.symbol,
                  label: f.label,
                  current_price: f.current_price,
                  predicted_direction: f.predicted_direction,
                  rationale: f.rationale,
                }))
              : DEFAULT_SLOTS,
          );
        } else {
          setExisting(null);
          setMarketTemp("warm");
          setTodayThoughts("");
          setNewsObservation("");
          setKospiCurrent("");
          setKospiForecast("");
          setKospiRationale("");
          setKospiCounter("");
          setEmotion("");
          setImpulseNote("");
          setForecasts(DEFAULT_SLOTS);
        }
      })
      .catch(() => {
        if (!cancelled) setExisting(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const readOnly = !!existing?.verified_at;

  async function handleSave() {
    setError("");
    setSaving(true);
    const valid = forecasts.filter((f) => f.symbol.trim() && f.label.trim());
    try {
      const saved = await createPrediction({
        date,
        market_temp: marketTemp,
        today_thoughts: todayThoughts,
        news_observation: newsObservation,
        kospi_current: kospiCurrent.trim() ? parseFloat(kospiCurrent) : null,
        kospi_forecast_1w: kospiForecast.trim() ? parseFloat(kospiForecast) : null,
        kospi_rationale: kospiRationale,
        kospi_counter_reason: kospiCounter,
        emotion_state: emotion,
        impulse_note: impulseNote,
        stock_forecasts: valid,
      });
      setExisting(saved);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장 실패";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function updateForecast(i: number, patch: Partial<StockForecastInput>) {
    setForecasts((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function addSlot() {
    setForecasts((arr) => [
      ...arr,
      { symbol: "", label: "", current_price: null, predicted_direction: "flat", rationale: "" },
    ]);
  }
  function removeSlot(i: number) {
    setForecasts((arr) => arr.filter((_, idx) => idx !== i));
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <label style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
          📅 날짜
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            fontFamily: "DM Sans",
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(18, 20, 28, 0.6)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            colorScheme: "dark",
          }}
        />
        {readOnly && <Badge color="gold">검증 완료 · 읽기 전용</Badge>}
        {existing && !readOnly && <Badge color="blue">저장됨 · 편집 가능</Badge>}
        {loading && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>불러오는 중…</span>}
      </div>

      <Card title="1. 시장 온도">
        <div className="flex gap-2">
          {MARKET_TEMPS.map((t) => (
            <ChipBtn
              key={t.code}
              active={marketTemp === t.code}
              onClick={() => setMarketTemp(t.code)}
              disabled={readOnly}
            >
              {t.label}
            </ChipBtn>
          ))}
        </div>
      </Card>

      <Card title="2. 오늘의 생각">
        <Textarea
          value={todayThoughts}
          onChange={setTodayThoughts}
          placeholder="자유 서술 — 오늘 본 시장, 느낌, 이벤트…"
          disabled={readOnly}
          rows={3}
        />
      </Card>

      <Card title="3. 오늘 본 큰 이슈" hint="뉴스 · 수급 · 환율/금리">
        <Textarea
          value={newsObservation}
          onChange={setNewsObservation}
          placeholder="없으면 '없음' — 뉴스/수급/환율금리 기록"
          disabled={readOnly}
          rows={3}
        />
      </Card>

      <Card
        title="4. 내일 예측 (종목별)"
        action={!readOnly ? { label: "+ 종목 추가", onClick: addSlot } : undefined}
      >
        <div className="space-y-2">
          {forecasts.map((f, i) => (
            <ForecastRow
              key={i}
              forecast={f}
              onChange={(patch) => updateForecast(i, patch)}
              onRemove={forecasts.length > 1 && !readOnly ? () => removeSlot(i) : undefined}
              disabled={readOnly}
            />
          ))}
        </div>
      </Card>

      <Card title="5. 1주일 예측 (KOSPI)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <NumberField label="현재 pt" value={kospiCurrent} onChange={setKospiCurrent} disabled={readOnly} />
          <NumberField label="1주일 뒤 예상 pt" value={kospiForecast} onChange={setKospiForecast} disabled={readOnly} />
        </div>
        <div className="space-y-2">
          <Textarea
            value={kospiRationale}
            onChange={setKospiRationale}
            placeholder="근거"
            disabled={readOnly}
            rows={2}
          />
          <Textarea
            value={kospiCounter}
            onChange={setKospiCounter}
            placeholder="내가 틀린다면 어떤 이유일까?"
            disabled={readOnly}
            rows={2}
          />
        </div>
      </Card>

      <Card title="6. 감정 체크">
        <div className="flex flex-wrap gap-2 mb-3">
          {EMOTIONS.map((e) => (
            <ChipBtn key={e} active={emotion === e} onClick={() => setEmotion(e)} disabled={readOnly}>
              {e}
            </ChipBtn>
          ))}
        </div>
        <Textarea
          value={impulseNote}
          onChange={setImpulseNote}
          placeholder="충동 매매하고 싶은가? 그렇다면 왜?"
          disabled={readOnly}
          rows={2}
        />
      </Card>

      {existing?.lesson && (
        <Card title="📘 다음날 회고 교훈">
          <div style={{ color: "var(--gold-bright)", fontFamily: "DM Sans", fontSize: 14, lineHeight: 1.6 }}>
            → {existing.lesson}
          </div>
        </Card>
      )}

      {!readOnly && (
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
            {saving ? "저장 중…" : existing ? "예측 업데이트" : "예측 저장"}
          </button>
          {saved && <span style={{ color: "var(--up)", fontFamily: "Outfit", fontSize: 12 }}>✓ 저장됨</span>}
          {error && <span style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</span>}
        </div>
      )}
    </div>
  );
}

// ─────────── History Tab ───────────

function HistoryTab() {
  const [items, setItems] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  function reload() {
    setLoading(true);
    listPredictions(30)
      .then((list) => setItems(list))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>
        불러오는 중…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-10 text-center">
        <div style={{ color: "var(--text-muted)", fontFamily: "DM Sans", fontSize: 14, lineHeight: 1.7 }}>
          아직 저장된 예측이 없습니다.
          <br />
          <span style={{ fontSize: 12 }}>「오늘 예측」 탭에서 첫 기록을 시작하세요.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3 max-w-4xl mx-auto">
      {items.map((p) => (
        <HistoryCard
          key={p.id}
          prediction={p}
          open={openId === p.id}
          onToggle={() => setOpenId((x) => (x === p.id ? null : p.id))}
          onVerified={reload}
        />
      ))}
    </div>
  );
}

function HistoryCard({
  prediction,
  open,
  onToggle,
  onVerified,
}: {
  prediction: Prediction;
  open: boolean;
  onToggle: () => void;
  onVerified: () => void;
}) {
  const verified = !!prediction.verified_at;
  const correctCount = prediction.stock_forecasts.filter((f) => f.is_correct === true).length;
  const totalWithOutcome = prediction.stock_forecasts.filter((f) => f.is_correct !== null).length;

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
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
            {prediction.date}
          </span>
          <Badge color="slate">{tempLabel(prediction.market_temp)}</Badge>
          <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>
            예측 {prediction.stock_forecasts.length}종목
          </span>
          {verified ? (
            <Badge color="gold">
              ✓ 검증 · {correctCount}/{totalWithOutcome} 적중
            </Badge>
          ) : (
            <Badge color="blue">⏳ 검증 대기</Badge>
          )}
        </div>
        <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border-default)", padding: "12px 16px 16px" }}>
          <PredictionDetail prediction={prediction} />
          {!verified && <VerifyForm prediction={prediction} onDone={onVerified} />}
          {verified && prediction.lesson && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "rgba(212, 165, 116, 0.06)",
                border: "1px solid rgba(212, 165, 116, 0.2)",
                color: "var(--gold-bright)",
                fontFamily: "DM Sans",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              📘 교훈 → {prediction.lesson}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PredictionDetail({ prediction }: { prediction: Prediction }) {
  return (
    <div className="space-y-2" style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-secondary)" }}>
      {prediction.today_thoughts && (
        <DetailLine label="오늘의 생각" value={prediction.today_thoughts} />
      )}
      {prediction.news_observation && (
        <DetailLine label="오늘 본 이슈" value={prediction.news_observation} />
      )}
      <div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>
          종목별 예측
        </div>
        <div className="space-y-1">
          {prediction.stock_forecasts.map((f) => (
            <div key={f.id} className="flex items-center gap-3 flex-wrap">
              <span style={{ color: "var(--text-primary)", fontWeight: 600, minWidth: 100 }}>
                {f.label || f.symbol}
              </span>
              <DirectionBadge direction={f.predicted_direction} label="예측" />
              {f.actual_direction && <DirectionBadge direction={f.actual_direction} label="실제" />}
              {f.is_correct != null && (
                <span style={{ color: f.is_correct ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                  {f.is_correct ? "✅" : "❌"}
                </span>
              )}
              {f.rationale && <span style={{ color: "var(--text-muted)" }}>— {f.rationale}</span>}
            </div>
          ))}
        </div>
      </div>
      {(prediction.kospi_current != null || prediction.kospi_forecast_1w != null) && (
        <DetailLine
          label="KOSPI 1주 예측"
          value={`${prediction.kospi_current ?? "—"}pt → ${prediction.kospi_forecast_1w ?? "—"}pt${
            prediction.kospi_rationale ? ` · ${prediction.kospi_rationale}` : ""
          }`}
        />
      )}
      {prediction.emotion_state && <DetailLine label="감정" value={prediction.emotion_state} />}
    </div>
  );
}

function VerifyForm({ prediction, onDone }: { prediction: Prediction; onDone: () => void }) {
  const [outcomes, setOutcomes] = useState<Record<number, Direction>>({});
  const [lesson, setLesson] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setActual(forecastId: number, d: Direction) {
    setOutcomes((o) => ({ ...o, [forecastId]: d }));
  }

  async function handleVerify() {
    setError("");
    setSaving(true);
    try {
      const payload: StockOutcome[] = prediction.stock_forecasts
        .filter((f) => outcomes[f.id])
        .map((f) => ({ forecast_id: f.id, actual_direction: outcomes[f.id], actual_pct: null }));
      await verifyPrediction(prediction.id, lesson, payload);
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "검증 저장 실패";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mt-3"
      style={{ padding: 12, borderRadius: 10, background: "rgba(56, 130, 246, 0.05)", border: "1px solid rgba(56, 130, 246, 0.2)" }}
    >
      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 12, color: "var(--blue)", marginBottom: 10 }}>
        🔍 검증 — 실제 방향 선택
      </div>
      <div className="space-y-2">
        {prediction.stock_forecasts.map((f) => (
          <div key={f.id} className="flex items-center gap-3 flex-wrap">
            <span style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-primary)", minWidth: 120 }}>
              {f.label || f.symbol}
            </span>
            <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
              예측: {directionArrow(f.predicted_direction)}
            </span>
            <DirectionPicker
              value={outcomes[f.id] ?? null}
              onChange={(d) => setActual(f.id, d)}
              compact
            />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Textarea
          value={lesson}
          onChange={setLesson}
          placeholder="교훈 1줄 (가장 중요)"
          rows={2}
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleVerify}
          disabled={saving}
          style={{
            fontFamily: "Outfit",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 16px",
            borderRadius: 8,
            background: "var(--blue)",
            color: "white",
            border: "none",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "저장 중…" : "검증 저장"}
        </button>
        {error && <span style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</span>}
      </div>
    </div>
  );
}

// ─────────── Stats Tab ───────────

function StatsTab() {
  const [month, setMonth] = useState<string>(currentMonthStr());
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMonthlyStats(month)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const accBand = useMemo(() => {
    if (!stats) return { label: "—", color: "var(--text-muted)" };
    const a = stats.accuracy_pct;
    if (stats.total_stock_forecasts === 0) return { label: "데이터 없음", color: "var(--text-muted)" };
    if (a >= 65) return { label: "전문가 영역", color: "var(--gold-bright)" };
    if (a >= 60) return { label: "엣지 존재", color: "var(--up)" };
    if (a >= 55) return { label: "평균 수준", color: "var(--blue)" };
    if (a >= 50) return { label: "동전 던지기", color: "var(--text-secondary)" };
    return { label: "개선 필요", color: "var(--down)" };
  }, [stats]);

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <label style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
          📅 월
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            fontFamily: "DM Sans",
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(18, 20, 28, 0.6)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            colorScheme: "dark",
          }}
        />
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>집계 중…</div>
      ) : !stats ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>통계 없음.</div>
      ) : (
        <>
          <Card title="이달 적중률">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 54, color: accBand.color, lineHeight: 1 }}>
                {stats.accuracy_pct}%
              </span>
              <span style={{ fontFamily: "Outfit", fontSize: 13, fontWeight: 700, color: accBand.color, letterSpacing: "0.05em" }}>
                {accBand.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <MiniStat label="총 예측 수(일)" value={stats.total_predictions} />
              <MiniStat label="종목 예측 수" value={stats.total_stock_forecasts} />
              <MiniStat label="적중 / 오답" value={`${stats.correct} / ${stats.wrong}`} />
            </div>
          </Card>

          <Card title="카테고리별 적중률">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["up", "flat", "down"] as Direction[]).map((d) => {
                const s = stats.by_direction[d] ?? { count: 0, correct: 0, pct: 0 };
                return (
                  <div
                    key={d}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-baseline justify-between">
                      <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: directionColor(d) }}>
                        {directionArrow(d)} {directionLabel(d)}
                      </span>
                      <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                        {s.pct}%
                      </span>
                    </div>
                    <div style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      {s.correct} / {s.count}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="기준점" hint="MasterWon 프레임">
            <ul style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.9, paddingLeft: 0, listStyle: "none" }}>
              <li>• 50% = 동전 던지기 수준 (개선 필요)</li>
              <li>• 55~60% = 평균 수준</li>
              <li>• 60%+ = 엣지 존재 (이 패턴에 베팅 가능)</li>
              <li>• 65%+ = 전문가 영역</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────── Helpers & Atoms ───────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="transition-all"
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
      {children}
    </button>
  );
}

function Card({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{title}</span>
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
        {action && (
          <button
            onClick={action.onClick}
            style={{
              fontFamily: "Outfit",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--blue)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipBtn({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      style={{
        fontFamily: "Outfit",
        fontSize: 12,
        fontWeight: 600,
        padding: "6px 14px",
        borderRadius: 999,
        background: active ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
        border: active ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
        color: active ? "var(--gold-bright)" : "var(--text-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 2,
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
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

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontFamily: "Outfit",
          fontSize: 10,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
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
    </div>
  );
}

function ForecastRow({
  forecast,
  onChange,
  onRemove,
  disabled,
}: {
  forecast: StockForecastInput;
  onChange: (patch: Partial<StockForecastInput>) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-start gap-2 flex-wrap"
      style={{
        padding: 10,
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <input
        placeholder="종목명"
        value={forecast.label}
        onChange={(e) => onChange({ label: e.target.value })}
        disabled={disabled}
        style={{
          width: 120,
          fontFamily: "DM Sans",
          fontSize: 13,
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(8, 9, 13, 0.6)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      <input
        placeholder="심볼 (005930.KS)"
        value={forecast.symbol}
        onChange={(e) => onChange({ symbol: e.target.value })}
        disabled={disabled}
        style={{
          width: 150,
          fontFamily: "DM Sans",
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(8, 9, 13, 0.6)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
          outline: "none",
        }}
      />
      <input
        type="number"
        step="0.01"
        placeholder="현재가"
        value={forecast.current_price ?? ""}
        onChange={(e) => onChange({ current_price: e.target.value ? parseFloat(e.target.value) : null })}
        disabled={disabled}
        style={{
          width: 100,
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
      <DirectionPicker
        value={forecast.predicted_direction}
        onChange={(d) => onChange({ predicted_direction: d })}
        disabled={disabled}
      />
      <input
        placeholder="근거"
        value={forecast.rationale}
        onChange={(e) => onChange({ rationale: e.target.value })}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 150,
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
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            fontFamily: "Outfit",
            fontSize: 11,
            padding: "6px 10px",
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
    </div>
  );
}

function DirectionPicker({
  value,
  onChange,
  disabled,
  compact,
}: {
  value: Direction | null;
  onChange: (d: Direction) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const opts: Array<{ code: Direction; arrow: string }> = [
    { code: "up", arrow: "▲" },
    { code: "flat", arrow: "▬" },
    { code: "down", arrow: "▼" },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => {
        const active = value === o.code;
        return (
          <button
            key={o.code}
            onClick={() => !disabled && onChange(o.code)}
            disabled={disabled}
            style={{
              fontFamily: "Outfit",
              fontSize: compact ? 13 : 14,
              fontWeight: 700,
              padding: compact ? "4px 8px" : "6px 10px",
              borderRadius: 6,
              background: active ? directionBg(o.code) : "rgba(255,255,255,0.02)",
              border: active ? `1px solid ${directionColor(o.code)}` : "1px solid var(--border-subtle)",
              color: active ? directionColor(o.code) : "var(--text-secondary)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {o.arrow}
          </button>
        );
      })}
    </div>
  );
}

function DirectionBadge({ direction, label }: { direction: Direction; label: string }) {
  return (
    <span
      style={{
        fontFamily: "Outfit",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 999,
        background: directionBg(direction),
        border: `1px solid ${directionColor(direction)}`,
        color: directionColor(direction),
        letterSpacing: "0.05em",
      }}
    >
      {label} {directionArrow(direction)}
    </span>
  );
}

function Badge({ color, children }: { color: "gold" | "blue" | "slate"; children: React.ReactNode }) {
  const map = {
    gold: { bg: "rgba(212, 165, 116, 0.12)", bd: "rgba(212, 165, 116, 0.4)", fg: "var(--gold-bright)" },
    blue: { bg: "rgba(56, 130, 246, 0.12)", bd: "rgba(56, 130, 246, 0.4)", fg: "var(--blue)" },
    slate: { bg: "rgba(255,255,255,0.04)", bd: "var(--border-subtle)", fg: "var(--text-secondary)" },
  }[color];
  return (
    <span
      style={{
        fontFamily: "Outfit",
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 999,
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </span>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--text-primary)", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 20, color: "var(--text-primary)", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function directionArrow(d: Direction): string {
  return d === "up" ? "▲" : d === "down" ? "▼" : "▬";
}
function directionLabel(d: Direction): string {
  return d === "up" ? "상승" : d === "down" ? "하락" : "횡보";
}
function directionColor(d: Direction): string {
  return d === "up" ? "var(--up)" : d === "down" ? "var(--down)" : "var(--text-secondary)";
}
function directionBg(d: Direction): string {
  return d === "up" ? "rgba(56, 217, 169, 0.1)" : d === "down" ? "rgba(244, 77, 93, 0.1)" : "rgba(255,255,255,0.04)";
}
function tempLabel(t: MarketTemp): string {
  return t === "cold" ? "차가움" : t === "hot" ? "뜨거움" : "미지근";
}
