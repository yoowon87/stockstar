import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompactNewsRow from "../components/news/CompactNewsRow";
import { fetchBackendNews, fetchMarketIndicators } from "../services/backendApi";
import {
  currentMonthStr,
  getMonthlyStats,
  getPredictionByDate,
  todayStr,
  type MonthlyStats,
  type Prediction,
} from "../services/journalApi";
import { getRoutine, saveRoutine, type RoutineLog } from "../services/routineApi";
import type { NewsItem } from "../types/api";

const IMPORTANCE_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

const ROUTINE_SLOTS: Array<{
  code: "morning" | "lunch" | "evening";
  label: string;
  minutes: number;
  desc: string;
  highlight?: boolean;
}> = [
  { code: "morning", label: "아침", minutes: 15, desc: "미국장 + 매크로 체크" },
  { code: "lunch", label: "점심", minutes: 15, desc: "한국 섹터 등락 이유" },
  { code: "evening", label: "저녁", minutes: 30, desc: "주 1종목 딥다이브", highlight: true },
];

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

export function HomePage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [activeNewsId, setActiveNewsId] = useState<string | null>(null);
  const [hoveredNewsId, setHoveredNewsId] = useState<string | null>(null);
  const [tickers, setTickers] = useState<Array<{ label: string; value: string; change: string }>>([]);
  const [routine, setRoutine] = useState<RoutineLog | null>(null);
  const [yesterdayPred, setYesterdayPred] = useState<Prediction | null>(null);
  const [yesterdayNoPred, setYesterdayNoPred] = useState(false);
  const [stats, setStats] = useState<MonthlyStats | null>(null);

  useEffect(() => {
    fetchBackendNews()
      .then((list) => setNews(list))
      .catch(() => setNews([]))
      .finally(() => setNewsLoading(false));
  }, []);

  useEffect(() => {
    fetchMarketIndicators().then((d) => {
      if (d.length > 0) setTickers(d);
    });
  }, []);

  useEffect(() => {
    getRoutine(todayStr()).then(setRoutine).catch(() => {});
    getPredictionByDate(yesterdayStr())
      .then((p) => {
        if (p) setYesterdayPred(p);
        else setYesterdayNoPred(true);
      })
      .catch(() => setYesterdayNoPred(true));
    getMonthlyStats(currentMonthStr()).then(setStats).catch(() => {});
  }, []);

  const topNews = useMemo(() => {
    return [...news]
      .sort((a, b) => {
        const imp = (IMPORTANCE_ORDER[b.importance] ?? 1) - (IMPORTANCE_ORDER[a.importance] ?? 1);
        if (imp !== 0) return imp;
        return b.published_at.localeCompare(a.published_at);
      })
      .slice(0, 12);
  }, [news]);

  const toggleRoutine = useCallback(
    async (slot: "morning" | "lunch" | "evening") => {
      if (!routine) return;
      const next = { ...routine, [`${slot}_done`]: !routine[`${slot}_done`] } as RoutineLog;
      setRoutine(next);
      try {
        const saved = await saveRoutine(todayStr(), {
          morning_done: next.morning_done,
          lunch_done: next.lunch_done,
          evening_done: next.evening_done,
          note: next.note,
        });
        setRoutine(saved);
      } catch {
        // rollback on failure
        setRoutine(routine);
      }
    },
    [routine],
  );

  function handleSelectNews(id: string) {
    setActiveNewsId(id);
    navigate(`/news/${id}`);
  }

  return (
    <div className="home-split-layout">
      {/* Left 65% */}
      <div className="home-map-pane" style={{ overflowY: "auto" }}>
        <div className="p-5 space-y-4">
          <SectionEyebrow
            text={`오늘 ${new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}`}
          />

          <Card title="시장 온도계" hint="환율/선물/만기일 경보는 추후">
            {tickers.length === 0 ? (
              <EmptyHint>시장 지표 로딩 중…</EmptyHint>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tickers.map((t) => (
                  <div
                    key={t.label}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                      {t.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "Outfit",
                        fontWeight: 700,
                        fontSize: 18,
                        color: "var(--text-primary)",
                        marginTop: 2,
                      }}
                    >
                      {t.value}
                    </div>
                    <div
                      style={{
                        fontFamily: "Outfit",
                        fontWeight: 600,
                        fontSize: 12,
                        color: t.change.startsWith("-") ? "var(--down)" : "var(--up)",
                      }}
                    >
                      {t.change}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="오늘의 루틴">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ROUTINE_SLOTS.map((r) => {
                const done = routine?.[`${r.code}_done`] ?? false;
                return (
                  <button
                    key={r.code}
                    onClick={() => toggleRoutine(r.code)}
                    disabled={!routine}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      textAlign: "left" as const,
                      cursor: routine ? "pointer" : "not-allowed",
                      background: done
                        ? "rgba(56, 217, 169, 0.08)"
                        : r.highlight
                          ? "rgba(212, 165, 116, 0.05)"
                          : "rgba(255,255,255,0.02)",
                      border: done
                        ? "1px solid rgba(56, 217, 169, 0.4)"
                        : r.highlight
                          ? "1px solid rgba(212, 165, 116, 0.25)"
                          : "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span
                        style={{
                          fontFamily: "Outfit",
                          fontWeight: 700,
                          fontSize: 13,
                          color: done
                            ? "var(--up)"
                            : r.highlight
                              ? "var(--gold-bright)"
                              : "var(--text-primary)",
                        }}
                      >
                        {done ? "✓ " : ""}
                        {r.label}
                        {r.highlight && !done && <span style={{ fontSize: 10, marginLeft: 6 }}>⭐</span>}
                      </span>
                      <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
                        {r.minutes}분
                      </span>
                    </div>
                    <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)" }}>{r.desc}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              title="어제 예측 검증"
              action={{ label: "Journal →", onClick: () => navigate("/journal") }}
            >
              {yesterdayPred ? (
                <YesterdaySummary prediction={yesterdayPred} />
              ) : yesterdayNoPred ? (
                <EmptyHint>어제 예측 없음. 오늘부터 Journal에 기록해보세요.</EmptyHint>
              ) : (
                <EmptyHint>불러오는 중…</EmptyHint>
              )}
            </Card>
            <Card
              title="이달 적중률"
              action={{ label: "통계 →", onClick: () => navigate("/journal") }}
            >
              {stats ? (
                <StatsSnapshot stats={stats} />
              ) : (
                <EmptyHint>불러오는 중…</EmptyHint>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Right 35% */}
      <div className="news-panel">
        <div
          className="flex items-center justify-between px-4 py-2.5 gap-2"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "Outfit",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "var(--gold)",
              }}
            >
              오늘의 핵심뉴스
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                background: "rgba(212, 165, 116, 0.08)",
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
              }}
            >
              {topNews.length}
            </span>
          </div>
        </div>

        <div className="news-panel-scroll">
          {newsLoading ? (
            <div className="flex items-center justify-center h-full">
              <span style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 12 }}>Loading…</span>
            </div>
          ) : topNews.length === 0 ? (
            <EmptyHint>뉴스가 없습니다.</EmptyHint>
          ) : (
            topNews.map((item, i) => (
              <div key={item.id} id={`news-row-${item.id}`}>
                <CompactNewsRow
                  news={item}
                  index={i}
                  isActive={activeNewsId === item.id || hoveredNewsId === item.id}
                  onSelect={handleSelectNews}
                  onHover={setHoveredNewsId}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function YesterdaySummary({ prediction }: { prediction: Prediction }) {
  const verified = !!prediction.verified_at;
  const correctCount = prediction.stock_forecasts.filter((f) => f.is_correct === true).length;
  const totalWithOutcome = prediction.stock_forecasts.filter((f) => f.is_correct !== null).length;
  const total = prediction.stock_forecasts.length;

  if (!verified) {
    return (
      <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        <span style={{ color: "var(--blue)", fontWeight: 600 }}>⏳ 검증 대기</span> — 예측 {total}종목.
        <br />
        Journal 히스토리 탭에서 실제 방향을 기록하세요.
      </div>
    );
  }

  const accuracy = totalWithOutcome > 0 ? Math.round((correctCount / totalWithOutcome) * 100) : 0;
  const accColor = accuracy >= 60 ? "var(--up)" : accuracy >= 50 ? "var(--gold-bright)" : "var(--down)";

  return (
    <div style={{ fontFamily: "DM Sans", fontSize: 13, lineHeight: 1.6 }}>
      <div className="flex items-baseline gap-2">
        <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 26, color: accColor }}>
          {correctCount}/{totalWithOutcome}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>적중 ({accuracy}%)</span>
      </div>
      {prediction.lesson && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            background: "rgba(212, 165, 116, 0.06)",
            border: "1px solid rgba(212, 165, 116, 0.2)",
            borderRadius: 8,
            color: "var(--gold-bright)",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          📘 {prediction.lesson}
        </div>
      )}
    </div>
  );
}

function StatsSnapshot({ stats }: { stats: MonthlyStats }) {
  if (stats.total_stock_forecasts === 0) {
    return (
      <EmptyHint>
        이달 검증된 예측 없음. 30일 축적 시 의미 있는 지표가 됩니다.
      </EmptyHint>
    );
  }
  const band = bandOf(stats.accuracy_pct);
  return (
    <div style={{ fontFamily: "DM Sans", fontSize: 13 }}>
      <div className="flex items-baseline gap-2">
        <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 32, color: band.color }}>
          {stats.accuracy_pct}%
        </span>
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 11, color: band.color, letterSpacing: "0.05em" }}>
          {band.label}
        </span>
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>
        적중 {stats.correct} / 오답 {stats.wrong} · 총 {stats.total_stock_forecasts}건
      </div>
    </div>
  );
}

function bandOf(acc: number): { label: string; color: string } {
  if (acc >= 65) return { label: "전문가 영역", color: "var(--gold-bright)" };
  if (acc >= 60) return { label: "엣지 존재", color: "var(--up)" };
  if (acc >= 55) return { label: "평균 수준", color: "var(--blue)" };
  if (acc >= 50) return { label: "동전 던지기", color: "var(--text-secondary)" };
  return { label: "개선 필요", color: "var(--down)" };
}

function SectionEyebrow({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "Outfit",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.2em",
        color: "var(--text-muted)",
        textTransform: "uppercase" as const,
      }}
    >
      {text}
    </div>
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
        background: "rgba(18, 20, 28, 0.6)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
            {title}
          </span>
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
              fontSize: 10,
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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
      {children}
    </div>
  );
}
