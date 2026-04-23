import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import countryGeocode from "../../public/country_geocode.json";

import { analyzeNewsItem, getNewsList } from "../services/api";
import { analyzeNewsWithAI, fetchBackendNews, fetchRegions, collectRegionNews } from "../services/backendApi";
import type { RegionInfo, RegionCollectResult } from "../services/backendApi";
import { useUserMemo } from "../hooks/useMemo";
import { broadcastNewsUpdate, useNewsSync } from "../hooks/useNewsSync";
import type { NewsItem } from "../types/api";

interface GeoInfo { name: string; flag: string }
const geocode = countryGeocode as Record<string, GeoInfo>;

function regionLabel(code: string): string {
  const geo = geocode[code];
  return geo ? `${geo.flag} ${geo.name}` : code;
}

const IMPORTANCE_DOTS: Record<string, number> = { high: 3, medium: 2, low: 1 };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NewsPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCollectPanel, setShowCollectPanel] = useState(false);
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set());
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState<{ done: number; total: number; current: string; results: RegionCollectResult[] }>({ done: 0, total: 0, current: "", results: [] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisInfo, setAnalysisInfo] = useState<{
    model?: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    cost_usd?: number;
    cost_krw?: number;
    investment_action?: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    fetchBackendNews()
      .then((backendItems) => {
        if (backendItems.length > 0) {
          setItems(backendItems);
          setSelectedId(
            backendItems.find((item: any) => item.id === newsId)?.id ?? backendItems[0]?.id ?? null,
          );
        } else {
          return getNewsList().then((fbItems) => {
            setItems(fbItems);
            setSelectedId(
              fbItems.find((item) => item.id === newsId)?.id ?? fbItems[0]?.id ?? null,
            );
          });
        }
      })
      .catch(() => {
        getNewsList().then((fbItems) => {
          setItems(fbItems);
          setSelectedId(
            fbItems.find((item) => item.id === newsId)?.id ?? fbItems[0]?.id ?? null,
          );
        }).catch(console.error);
      });
  }, []);

  useEffect(() => {
    if (newsId && items.length > 0) {
      const match = items.find((item) => item.id === newsId);
      if (match) setSelectedId(match.id);
    }
  }, [newsId, items]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    setAnalysisInfo(null);
    setAnalysisError(null);
  }, [selectedId]);

  async function handleAnalyze() {
    if (!selected) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisInfo(null);
    try {
      const aiResult = await analyzeNewsWithAI(selected.id);
      const { token_usage, investment_action, ...rest } = aiResult;
      setItems((current) =>
        current.map((item) => (item.id === selected.id ? { ...item, ...rest } : item)),
      );
      setAnalysisInfo({
        ...(token_usage || {}),
        investment_action: investment_action || "",
      });
    } catch (err: any) {
      setAnalysisError(err?.message || "AI analysis failed");
      try {
        const updated = await analyzeNewsItem(selected.id);
        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } catch (e) {
        console.error("Fallback analysis also failed:", e);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function openCollectPanel() {
    setShowCollectPanel(true);
    if (regions.length === 0) {
      const r = await fetchRegions();
      setRegions(r);
      setSelectedRegions(new Set(r.map((x) => x.code)));
    }
  }

  function toggleRegion(code: string) {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    if (selectedRegions.size === regions.length) {
      setSelectedRegions(new Set());
    } else {
      setSelectedRegions(new Set(regions.map((r) => r.code)));
    }
  }

  async function handleCollect() {
    const codes = Array.from(selectedRegions);
    if (codes.length === 0) return;

    setIsCollecting(true);
    setCollectProgress({ done: 0, total: codes.length, current: "", results: [] });

    const results: RegionCollectResult[] = [];

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      const label = regionLabel(code);
      setCollectProgress({ done: i, total: codes.length, current: label, results: [...results] });

      const result = await collectRegionNews(code);
      results.push(result);
    }

    setCollectProgress({ done: codes.length, total: codes.length, current: "", results });
    setIsCollecting(false);

    try {
      const backendNews = await fetchBackendNews();
      if (backendNews.length > 0) {
        setItems(backendNews);
        setSelectedId(backendNews[0]?.id ?? null);
      } else {
        const firebaseNews = await getNewsList();
        setItems(firebaseNews);
        setSelectedId(firebaseNews[0]?.id ?? null);
      }
    } catch {
      const firebaseNews = await getNewsList();
      setItems(firebaseNews);
      setSelectedId(firebaseNews[0]?.id ?? null);
    }
    broadcastNewsUpdate();
  }

  if (!selected) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "var(--bg-deep)", color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>
        Loading news...
      </div>
    );
  }

  const originGeo = geocode[selected.origin_country];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      {/* Left: News List */}
      <div
        className="w-[340px] flex-shrink-0 flex flex-col"
        style={{
          borderRight: "1px solid var(--border-default)",
          background: "var(--bg-base)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-2.5 flex items-center justify-between gap-2"
          style={{ borderBottom: "1px solid var(--border-default)" }}
        >
          <span style={{
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            color: "var(--gold)",
          }}>
            NEWS FEED
            <span
              className="ml-2 font-mono"
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                background: "rgba(212, 165, 116, 0.08)",
                padding: "2px 6px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                fontWeight: 500,
              }}
            >
              {items.length}
            </span>
          </span>
          <button
            type="button"
            className="transition-all"
            onClick={showCollectPanel ? () => setShowCollectPanel(false) : openCollectPanel}
            disabled={isCollecting}
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: 8,
              background: showCollectPanel ? "rgba(239, 68, 68, 0.08)" : "rgba(56, 217, 169, 0.1)",
              border: showCollectPanel ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(56, 217, 169, 0.25)",
              color: showCollectPanel ? "var(--down)" : "var(--teal)",
              cursor: isCollecting ? "wait" : "pointer",
              opacity: isCollecting ? 0.6 : 1,
            }}
          >
            {isCollecting ? "Collecting..." : showCollectPanel ? "CLOSE" : "COLLECT"}
          </button>
        </div>

        {/* Collect Panel */}
        {showCollectPanel && (
          <div style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}>
            <div className="px-4 py-2.5">
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "Outfit", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                  Select Regions
                </span>
                <button
                  onClick={toggleAll}
                  style={{ fontFamily: "Outfit", fontSize: 10, fontWeight: 600, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {selectedRegions.size === regions.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {regions.map((r) => (
                  <label
                    key={r.code}
                    className="flex items-center gap-1 cursor-pointer transition-colors"
                    style={{
                      fontSize: 10,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: selectedRegions.has(r.code) ? "rgba(56, 217, 169, 0.08)" : "rgba(255,255,255, 0.02)",
                      border: selectedRegions.has(r.code) ? "1px solid rgba(56, 217, 169, 0.25)" : "1px solid var(--border-subtle)",
                      color: selectedRegions.has(r.code) ? "var(--teal)" : "var(--text-muted)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRegions.has(r.code)}
                      onChange={() => toggleRegion(r.code)}
                      className="hidden"
                    />
                    {regionLabel(r.code)}
                  </label>
                ))}
              </div>
            </div>

            {(isCollecting || collectProgress.results.length > 0) && (
              <div className="px-4 py-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(212, 165, 116, 0.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${collectProgress.total > 0 ? (collectProgress.done / collectProgress.total) * 100 : 0}%`,
                        background: "linear-gradient(90deg, var(--teal), var(--blue))",
                      }}
                    />
                  </div>
                  <span className="font-mono flex-shrink-0 w-[50px] text-right" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {collectProgress.done}/{collectProgress.total}
                  </span>
                </div>
                {isCollecting && collectProgress.current && (
                  <div style={{ fontSize: 10, color: "var(--teal)" }}>{collectProgress.current}...</div>
                )}
                {!isCollecting && collectProgress.results.length > 0 && (
                  <div style={{ fontSize: 10, color: "var(--teal)" }}>
                    {collectProgress.results.reduce((s, r) => s + r.fetched, 0)} fetched /&nbsp;
                    <strong>{collectProgress.results.reduce((s, r) => s + r.inserted, 0)} new</strong>
                    &nbsp;(DB {collectProgress.results[collectProgress.results.length - 1]?.total_in_db ?? 0})
                  </div>
                )}
              </div>
            )}

            <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <button
                type="button"
                className="w-full py-2 transition-all"
                onClick={handleCollect}
                disabled={isCollecting || selectedRegions.size === 0}
                style={{
                  fontFamily: "Outfit",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 8,
                  background: isCollecting ? "rgba(56, 217, 169, 0.06)" : "rgba(56, 217, 169, 0.12)",
                  border: "1px solid rgba(56, 217, 169, 0.3)",
                  color: "var(--teal)",
                  cursor: isCollecting || selectedRegions.size === 0 ? "not-allowed" : "pointer",
                  opacity: isCollecting || selectedRegions.size === 0 ? 0.4 : 1,
                }}
              >
                {isCollecting
                  ? `Collecting... (${collectProgress.done}/${collectProgress.total})`
                  : `Collect ${selectedRegions.size} Region${selectedRegions.size > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* News List */}
        <div className="flex-1 overflow-y-auto news-panel-scroll">
          {items.map((item) => {
            const geo = geocode[item.origin_country];
            const isActive = item.id === selected.id;
            const dots = IMPORTANCE_DOTS[item.importance] ?? 2;
            return (
              <button
                key={item.id}
                type="button"
                className={`news-row w-full text-left ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setSelectedId(item.id);
                  navigate(`/news/${item.id}`);
                }}
              >
                {/* Line 1: meta */}
                <div className="flex items-center gap-1.5 mb-0.5" style={{ fontSize: 11 }}>
                  <span className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className="inline-block w-1 h-1 rounded-full"
                        style={{
                          background: i < dots
                            ? dots === 3 ? "var(--down)" : "var(--gold)"
                            : "rgba(212, 165, 116, 0.08)",
                        }}
                      />
                    ))}
                  </span>
                  <span>{geo?.flag ?? '\u{1F310}'}</span>
                  <span className="truncate" style={{ color: "var(--gold-dim)", fontWeight: 500 }}>
                    {item.speaker?.name || geo?.name || item.origin_country}
                  </span>
                  <span className="ml-auto flex-shrink-0 font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {timeAgo(item.published_at)}
                  </span>
                  <span
                    className="flex-shrink-0 font-mono font-bold"
                    style={{
                      fontSize: 8,
                      padding: "1px 5px",
                      borderRadius: 4,
                      background: item.analysis_status === '\uBD84\uC11D \uC644\uB8CC'
                        ? "rgba(16, 185, 129, 0.1)" : "rgba(212, 165, 116, 0.06)",
                      border: item.analysis_status === '\uBD84\uC11D \uC644\uB8CC'
                        ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--border-subtle)",
                      color: item.analysis_status === '\uBD84\uC11D \uC644\uB8CC'
                        ? "var(--up)" : "var(--text-muted)",
                    }}
                  >
                    {item.analysis_status === '\uBD84\uC11D \uC644\uB8CC' ? 'DONE' : 'RAW'}
                  </span>
                </div>
                {/* Line 2: title */}
                <div
                  className="truncate mb-0.5"
                  style={{
                    fontSize: 12,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </div>
                {/* Line 3: tags */}
                <div className="flex items-center gap-1 flex-wrap" style={{ fontSize: 10 }}>
                  {(item.positive_industries || []).slice(0, 2).map((ind) => (
                    <span key={ind} style={{ color: "var(--up)" }}>{ind}\u2191</span>
                  ))}
                  {(item.negative_industries || []).slice(0, 2).map((ind) => (
                    <span key={ind} style={{ color: "var(--down)" }}>{ind}\u2193</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 overflow-y-auto p-6 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                style={{
                  fontFamily: "Outfit",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "rgba(59, 158, 255, 0.1)",
                  border: "1px solid rgba(59, 158, 255, 0.2)",
                  color: "var(--blue)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                }}
              >
                {selected.event_type}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{selected.source}</span>
              <span className="font-mono" style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(selected.published_at)}</span>
            </div>
            <h2
              className="leading-snug"
              style={{
                fontFamily: "Outfit",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              {selected.title}
            </h2>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {selected.link && (
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-all"
                style={{
                  fontFamily: "Outfit",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "rgba(212, 165, 116, 0.06)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)",
                }}
              >
                Source \u2197
              </a>
            )}
            <button
              className="transition-all"
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 16px",
                borderRadius: 8,
                background: isAnalyzing
                  ? "rgba(59, 158, 255, 0.06)"
                  : "linear-gradient(135deg, var(--blue), #6366f1)",
                border: isAnalyzing ? "1px solid rgba(59, 158, 255, 0.2)" : "none",
                color: isAnalyzing ? "var(--blue)" : "#fff",
                cursor: isAnalyzing ? "wait" : "pointer",
                boxShadow: isAnalyzing ? "none" : "0 2px 12px rgba(59, 158, 255, 0.3)",
              }}
            >
              {isAnalyzing ? "Analyzing..." : "AI Analysis"}
            </button>
          </div>
        </div>

        {/* Analysis Info */}
        {analysisError && (
          <div
            className="mb-4 px-4 py-2.5 rounded-lg"
            style={{
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              fontSize: 11,
              color: "var(--down)",
            }}
          >
            {analysisError}
          </div>
        )}
        {analysisInfo?.total_tokens && (
          <div
            className="mb-4 px-4 py-2.5 rounded-lg flex items-center gap-4 font-mono"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              fontSize: 11,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Model: <span style={{ color: "var(--text-secondary)" }}>{analysisInfo.model}</span></span>
            <span style={{ color: "var(--text-muted)" }}>Tokens: <span style={{ color: "var(--text-secondary)" }}>{analysisInfo.input_tokens?.toLocaleString()}\u2191 {analysisInfo.output_tokens?.toLocaleString()}\u2193 = {analysisInfo.total_tokens?.toLocaleString()}</span></span>
            <span style={{ color: "var(--text-muted)" }}>Cost: <span style={{ color: "var(--up)" }}>${analysisInfo.cost_usd?.toFixed(4)}</span> <span style={{ color: "var(--text-muted)" }}>(\u20A9{analysisInfo.cost_krw?.toFixed(1)})</span></span>
          </div>
        )}

        {/* Speaker + Origin */}
        <div className="flex items-center gap-2 mb-5" style={{ fontSize: 14 }}>
          <span style={{ fontSize: 20 }}>{originGeo?.flag ?? '\u{1F310}'}</span>
          <span style={{ color: "var(--gold)", fontFamily: "Outfit", fontWeight: 600 }}>{selected.speaker?.name}</span>
          <span style={{ color: "var(--border-strong)" }}>\u00B7</span>
          <span style={{ color: "var(--text-secondary)" }}>{originGeo?.name ?? selected.origin_country}</span>
        </div>

        {/* Summary */}
        <p
          className="mb-5 pl-4"
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            borderLeft: "2px solid var(--border-strong)",
          }}
        >
          {selected.summary}
        </p>

        {/* Tags Grid */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {selected.positive_industries.map((ind) => (
            <span
              key={ind}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                color: "var(--up)",
              }}
            >
              \u2191 {ind}
            </span>
          ))}
          {selected.negative_industries.map((ind) => (
            <span
              key={ind}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "var(--down)",
              }}
            >
              \u2193 {ind}
            </span>
          ))}
          {(selected.positive_industries.length > 0 || selected.negative_industries.length > 0) &&
            (selected.affected_countries || []).length > 0 && (
              <span className="w-px h-5 self-center mx-1" style={{ background: "var(--border-default)" }} />
            )}
          {(selected.affected_countries || []).map((ac) => (
            <span
              key={ac.country}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 6,
                background: ac.direction === 'positive' ? "rgba(16, 185, 129, 0.06)" : ac.direction === 'negative' ? "rgba(239, 68, 68, 0.06)" : "rgba(212, 165, 116, 0.04)",
                border: `1px solid ${ac.direction === 'positive' ? "rgba(16, 185, 129, 0.15)" : ac.direction === 'negative' ? "rgba(239, 68, 68, 0.15)" : "var(--border-subtle)"}`,
                color: ac.direction === 'positive' ? "var(--up)" : ac.direction === 'negative' ? "var(--down)" : "var(--text-muted)",
              }}
            >
              {geocode[ac.country]?.flag} {geocode[ac.country]?.name ?? ac.country} {ac.direction === 'positive' ? '\u2191' : ac.direction === 'negative' ? '\u2193' : '\u2014'}
            </span>
          ))}
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
          <DetailCard title="AI INTERPRETATION" accent="var(--blue)">
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{selected.ai_summary}</p>
          </DetailCard>

          {analysisInfo?.investment_action && (
            <DetailCard title="INVESTMENT ACTION" accent="var(--gold)" className="lg:col-span-2">
              <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7 }}>{analysisInfo.investment_action}</p>
            </DetailCard>
          )}

          <DetailCard title="COUNTER ARGUMENTS" accent="var(--warning)">
            <ul className="space-y-2">
              {selected.counter_arguments.map((point, i) => (
                <li key={i} className="flex gap-2" style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>\u2022</span>
                  {point}
                </li>
              ))}
            </ul>
          </DetailCard>
        </div>

        {/* Related Symbols */}
        <DetailCard title="RELATED STOCKS" accent="var(--teal)">
          <div className="flex flex-wrap gap-2">
            {selected.related_symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => navigate(`/stocks/${symbol}`)}
                className="transition-all"
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 12px",
                  borderRadius: 8,
                  background: "rgba(212, 165, 116, 0.04)",
                  border: "1px solid var(--border-default)",
                  color: "var(--gold)",
                  cursor: "pointer",
                }}
              >
                {symbol}
              </button>
            ))}
          </div>
        </DetailCard>

        {/* My Memo */}
        <div className="mt-5">
          <UserMemoBox memoKey={`news:${selected.id}`} />
        </div>
      </div>
    </div>
  );
}

function DetailCard({ title, accent, children, className = "" }: { title: string; accent: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-4 ${className}`}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <h4
        className="mb-2.5"
        style={{
          fontFamily: "Outfit",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: accent,
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function UserMemoBox({ memoKey }: { memoKey: string }) {
  const [memo, setMemo] = useUserMemo(memoKey);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo);

  useEffect(() => {
    setDraft(memo);
    setEditing(false);
  }, [memoKey, memo]);

  function handleSave() {
    setMemo(draft);
    setEditing(false);
  }

  return (
    <div
      className="p-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid rgba(212, 165, 116, 0.2)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <h4 style={{
          fontFamily: "Outfit",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase" as const,
          color: "var(--gold)",
        }}>
          MY MEMO
        </h4>
        {!editing && (
          <button
            onClick={() => { setDraft(memo); setEditing(true); }}
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {memo ? 'Edit' : 'Write'}
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write your thoughts about this news..."
            className="w-full h-24 p-3 resize-none focus:outline-none transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-primary)",
              fontFamily: "DM Sans",
            }}
            autoFocus
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                fontWeight: 500,
                padding: "5px 12px",
                borderRadius: 8,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 14px",
                borderRadius: 8,
                background: "rgba(212, 165, 116, 0.15)",
                border: "1px solid rgba(212, 165, 116, 0.3)",
                color: "var(--gold-bright)",
                cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>
        </div>
      ) : memo ? (
        <p className="whitespace-pre-wrap" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{memo}</p>
      ) : (
        <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>No memo yet. Click 'Write' to add notes.</p>
      )}
    </div>
  );
}
