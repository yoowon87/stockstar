import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import {
  formatKoreanAmount,
  getStockChart,
  getStockSummary,
  type ChartCandle,
  type StockSummary,
} from "../services/themeApi";

interface Props {
  stockCode: string;
  stockName: string;
  onClose: () => void;
}

const PRESETS: Array<{ days: number; label: string }> = [
  { days: 30, label: "1M" },
  { days: 60, label: "3M" },
  { days: 120, label: "6M" },
  { days: 250, label: "1Y" },
];

export function StockChartModal({ stockCode, stockName, onClose }: Props) {
  const [days, setDays] = useState(60);
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch chart on days change
  useEffect(() => {
    setLoading(true);
    setError("");
    getStockChart(stockCode, days)
      .then((r) => {
        if (r.error) throw new Error(r.error);
        setCandles(r.candles);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "차트 로드 실패"))
      .finally(() => setLoading(false));
  }, [stockCode, days]);

  // Fetch summary once per stock
  useEffect(() => {
    setSummary(null);
    getStockSummary(stockCode)
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [stockCode]);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: "rgba(8, 9, 13, 0)" },
        textColor: "#9ba1a6",
        fontFamily: "DM Sans, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: false,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      crosshair: { mode: 1 },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#38d9a9",
      downColor: "#f44d5d",
      borderUpColor: "#38d9a9",
      borderDownColor: "#f44d5d",
      wickUpColor: "#38d9a9",
      wickDownColor: "#f44d5d",
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "rgba(212, 165, 116, 0.4)",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Push data into series
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;
    const candleData = candles.map((c) => ({
      time: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    const volumeData = candles.map((c) => ({
      time: c.date,
      value: c.volume,
      color: c.close >= c.open ? "rgba(56, 217, 169, 0.35)" : "rgba(244, 77, 93, 0.35)",
    }));
    candleSeriesRef.current.setData(candleData as any);
    volumeSeriesRef.current.setData(volumeData as any);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  const last = candles[candles.length - 1];
  const first = candles[0];
  const periodPct = first && last ? ((last.close - first.close) / first.close) * 100 : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(820px, 100%)",
          maxHeight: "90vh",
          background: "var(--bg-deep)",
          border: "1px solid var(--border-default)",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
              {stockName}
            </span>
            <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>{stockCode}</span>
            {last && (
              <>
                <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
                  {last.close.toLocaleString("ko-KR")}원
                </span>
                <span
                  style={{
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    fontSize: 13,
                    color: periodPct >= 0 ? "var(--up)" : "var(--down)",
                  }}
                >
                  {periodPct >= 0 ? "+" : ""}
                  {periodPct.toFixed(2)}% ({days}일)
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {PRESETS.map((p) => {
              const active = days === p.days;
              return (
                <button
                  key={p.days}
                  onClick={() => setDays(p.days)}
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 10px",
                    borderRadius: 8,
                    background: active ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.04)",
                    border: active ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
                    color: active ? "var(--gold-bright)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              onClick={onClose}
              style={{
                fontFamily: "Outfit",
                fontSize: 14,
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </div>

        {last && (
          <div className="flex gap-4 flex-wrap" style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--text-muted)" }}>
            <span>O <b style={{ color: "var(--text-primary)" }}>{last.open.toLocaleString("ko-KR")}</b></span>
            <span>H <b style={{ color: "var(--up)" }}>{last.high.toLocaleString("ko-KR")}</b></span>
            <span>L <b style={{ color: "var(--down)" }}>{last.low.toLocaleString("ko-KR")}</b></span>
            <span>V <b style={{ color: "var(--text-primary)" }}>{last.volume.toLocaleString("ko-KR")}</b></span>
            <span>최근 봉 {last.date}</span>
          </div>
        )}

        <SummaryRow summary={summary} />

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: 380,
            position: "relative",
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                fontFamily: "Outfit",
                fontSize: 13,
              }}
            >
              차트 불러오는 중…
            </div>
          )}
          {error && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--down)",
                fontFamily: "DM Sans",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ summary }: { summary: StockSummary | null }) {
  if (!summary) {
    return (
      <div
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border-subtle)",
          fontFamily: "Outfit",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        재무 지표 불러오는 중…
      </div>
    );
  }
  const roeBand = roeMeaning(summary.roe);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
        padding: 10,
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <SummaryCell label="거래대금" value={summary.trade_amount != null ? `${formatKoreanAmount(summary.trade_amount)}원` : "—"} />
      <SummaryCell label="시가총액" value={summary.market_cap != null ? `${formatKoreanAmount(summary.market_cap)}원` : "—"} />
      <SummaryCell label="PER" value={summary.per != null ? summary.per.toFixed(2) : "—"} />
      <SummaryCell label="PBR" value={summary.pbr != null ? summary.pbr.toFixed(2) : "—"} />
      <SummaryCell
        label={`ROE ${summary.ratio_period ? `(${summary.ratio_period.slice(0, 4)}.${summary.ratio_period.slice(4, 6)})` : ""}`}
        value={summary.roe != null ? `${summary.roe.toFixed(2)}%` : "—"}
        valueColor={roeBand.color}
        suffix={summary.roe != null ? roeBand.label : null}
        suffixColor={roeBand.color}
      />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  valueColor,
  suffix,
  suffixColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
  suffix?: string | null;
  suffixColor?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "Outfit",
          fontSize: 9,
          color: "var(--text-muted)",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 14,
            color: valueColor ?? "var(--text-primary)",
          }}
        >
          {value}
        </span>
        {suffix && (
          <span
            style={{
              fontFamily: "Outfit",
              fontWeight: 600,
              fontSize: 10,
              color: suffixColor ?? "var(--text-muted)",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function roeMeaning(roe: number | null): { label: string; color: string } {
  if (roe == null) return { label: "—", color: "var(--text-muted)" };
  if (roe >= 20) return { label: "매우 우수", color: "var(--up)" };
  if (roe >= 15) return { label: "우수", color: "var(--up)" };
  if (roe >= 10) return { label: "양호", color: "var(--gold-bright)" };
  if (roe >= 5) return { label: "평균", color: "var(--text-secondary)" };
  if (roe >= 0) return { label: "낮음", color: "var(--down)" };
  return { label: "적자", color: "var(--down)" };
}
