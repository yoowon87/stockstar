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

const IMPORTANCE_STARS: Record<string, string> = { high: '★★★', medium: '★★', low: '★' };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}분 전`;
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
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

  // Load news once on mount — try backend first, fallback to Firebase
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
  }, []); // only on mount, not on newsId change

  // Sync selectedId when navigating via URL
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

  // Clear analysis info when switching news
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
      // Real AI analysis via backend (OpenAI)
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
      setAnalysisError(err?.message || "AI 분석 실패 — 백엔드 서버가 실행 중인지 확인하세요");
      // Fallback to mock
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

  // Load regions on first panel open
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

    // Refresh news list and select first item
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
    // Notify other pages (Home) to refresh
    broadcastNewsUpdate();
  }

  if (!selected) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        뉴스를 불러오는 중...
      </div>
    );
  }

  const originGeo = geocode[selected.origin_country];

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Left: News List */}
      <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-slate-800 bg-[#0b1220]">
        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            News Feed · {items.length}건
          </span>
          <button
            type="button"
            className="text-[10px] px-2 py-1 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-medium transition-colors"
            onClick={showCollectPanel ? () => setShowCollectPanel(false) : openCollectPanel}
            disabled={isCollecting}
          >
            {isCollecting ? "수집 중..." : showCollectPanel ? "✕ 닫기" : "🌐 뉴스 수집"}
          </button>
        </div>

        {/* Collect Panel */}
        {showCollectPanel && (
          <div className="border-b border-slate-800 bg-[#0a1628]">
            {/* Region checkboxes */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500 font-medium">수집 지역 선택</span>
                <button onClick={toggleAll} className="text-[10px] text-teal-400 hover:text-teal-300">
                  {selectedRegions.size === regions.length ? "전체 해제" : "전체 선택"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {regions.map((r) => (
                  <label
                    key={r.code}
                    className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded cursor-pointer border transition-colors ${
                      selectedRegions.has(r.code)
                        ? "bg-teal-900/50 border-teal-700 text-teal-200"
                        : "bg-slate-900 border-slate-700 text-slate-500"
                    }`}
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

            {/* Progress bar */}
            {(isCollecting || collectProgress.results.length > 0) && (
              <div className="px-3 py-1.5 border-t border-slate-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-300"
                      style={{ width: `${collectProgress.total > 0 ? (collectProgress.done / collectProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 w-[60px] text-right">
                    {collectProgress.done}/{collectProgress.total}
                  </span>
                </div>
                {isCollecting && collectProgress.current && (
                  <div className="text-[10px] text-teal-400">{collectProgress.current} 수집 중...</div>
                )}
                {!isCollecting && collectProgress.results.length > 0 && (
                  <div className="text-[10px] text-teal-300">
                    {collectProgress.results.reduce((s, r) => s + r.fetched, 0)}건 수집 →{" "}
                    <strong>{collectProgress.results.reduce((s, r) => s + r.inserted, 0)}건 신규</strong>
                    {" "}(DB {collectProgress.results[collectProgress.results.length - 1]?.total_in_db ?? 0}건)
                  </div>
                )}
              </div>
            )}

            {/* Start button */}
            <div className="px-3 py-2 border-t border-slate-800/50">
              <button
                type="button"
                className="w-full text-[11px] py-1.5 rounded bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-medium transition-colors"
                onClick={handleCollect}
                disabled={isCollecting || selectedRegions.size === 0}
              >
                {isCollecting
                  ? `수집 중... (${collectProgress.done}/${collectProgress.total})`
                  : `${selectedRegions.size}개 지역 수집 시작`}
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto news-panel-scroll">
          {items.map((item) => {
            const geo = geocode[item.origin_country];
            const isActive = item.id === selected.id;
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
                <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
                  <span className="text-yellow-500">{IMPORTANCE_STARS[item.importance] ?? '★★'}</span>
                  <span>{geo?.flag ?? '🌐'}</span>
                  <span className="text-blue-400 truncate">{item.speaker?.name || geo?.name || item.origin_country}</span>
                  <span className="ml-auto text-slate-600 flex-shrink-0">{timeAgo(item.published_at)}</span>
                  <span className={`px-1 py-px rounded text-[9px] font-bold flex-shrink-0 ${
                    item.analysis_status === '분석 완료'
                      ? 'bg-green-900/60 text-green-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {item.analysis_status === '분석 완료' ? '완료' : '미분석'}
                  </span>
                </div>
                {/* Line 2: title */}
                <div className="text-[12px] text-slate-200 leading-snug truncate mb-0.5">
                  {item.title}
                </div>
                {/* Line 3: tags */}
                <div className="flex items-center gap-1 text-[10px] flex-wrap">
                  {(item.positive_industries || []).slice(0, 2).map((ind) => (
                    <span key={ind} className="text-emerald-400">{ind}↑</span>
                  ))}
                  {(item.negative_industries || []).slice(0, 2).map((ind) => (
                    <span key={ind} className="text-red-400">{ind}↓</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 overflow-y-auto p-5 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold">
                {selected.event_type}
              </span>
              <span className="text-[11px] text-slate-500">{selected.source}</span>
              <span className="text-[11px] text-slate-600">{timeAgo(selected.published_at)}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              {selected.title}
            </h2>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {selected.link && (
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-colors"
              >
                원본 기사 ↗
              </a>
            )}
            <button
              className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "분석 중..." : "AI 분석"}
            </button>
          </div>
        </div>

        {/* Analysis Info: token usage + cost */}
        {analysisError && (
          <div className="mb-3 px-3 py-2 rounded bg-red-900/30 border border-red-800/40 text-[11px] text-red-300">
            {analysisError}
          </div>
        )}
        {analysisInfo?.total_tokens && (
          <div className="mb-3 px-3 py-2 rounded bg-slate-900 border border-slate-800 flex items-center gap-4 text-[11px]">
            <span className="text-slate-500">모델: <span className="text-slate-300">{analysisInfo.model}</span></span>
            <span className="text-slate-500">토큰: <span className="text-slate-300">{analysisInfo.input_tokens?.toLocaleString()}↑ {analysisInfo.output_tokens?.toLocaleString()}↓ = {analysisInfo.total_tokens?.toLocaleString()}</span></span>
            <span className="text-slate-500">비용: <span className="text-green-400">${analysisInfo.cost_usd?.toFixed(4)}</span> <span className="text-slate-600">(₩{analysisInfo.cost_krw?.toFixed(1)})</span></span>
          </div>
        )}

        {/* Speaker + Origin */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="text-lg">{originGeo?.flag ?? '🌐'}</span>
          <span className="text-blue-400 font-medium">{selected.speaker?.name}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{originGeo?.name ?? selected.origin_country}</span>
        </div>

        {/* Summary */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4 border-l-2 border-slate-700 pl-3">
          {selected.summary}
        </p>

        {/* Tags Grid: Industries + Countries */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {selected.positive_industries.map((ind) => (
            <span key={ind} className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/40">
              ↑ {ind}
            </span>
          ))}
          {selected.negative_industries.map((ind) => (
            <span key={ind} className="text-[11px] px-2 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-800/40">
              ↓ {ind}
            </span>
          ))}
          <span className="w-px h-4 bg-slate-700 self-center mx-1" />
          {(selected.affected_countries || []).map((ac) => (
            <span
              key={ac.country}
              className={`text-[11px] px-2 py-0.5 rounded border ${
                ac.direction === 'positive'
                  ? 'bg-green-900/30 text-green-400 border-green-800/40'
                  : ac.direction === 'negative'
                  ? 'bg-red-900/30 text-red-400 border-red-800/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {geocode[ac.country]?.flag} {geocode[ac.country]?.name ?? ac.country} {ac.direction === 'positive' ? '↑' : ac.direction === 'negative' ? '↓' : '—'}
            </span>
          ))}
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* AI Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">AI 해석</h4>
            <p className="text-[13px] text-slate-300 leading-relaxed">{selected.ai_summary}</p>
          </div>

          {/* Investment Action */}
          {analysisInfo?.investment_action && (
            <div className="bg-blue-950 border border-blue-800/40 rounded-lg p-4 lg:col-span-2">
              <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-wide mb-2">투자 액션</h4>
              <p className="text-[13px] text-slate-200 leading-relaxed">{analysisInfo.investment_action}</p>
            </div>
          )}

          {/* Counter Arguments */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">반대 논리</h4>
            <ul className="space-y-1.5">
              {selected.counter_arguments.map((point, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-slate-400 leading-snug">
                  <span className="text-slate-600 flex-shrink-0">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Related Symbols */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">관련 종목</h4>
          <div className="flex flex-wrap gap-2">
            {selected.related_symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => navigate(`/stocks/${symbol}`)}
                className="text-[12px] px-2.5 py-1 rounded bg-slate-800 text-blue-400 hover:bg-slate-700 hover:text-blue-300 border border-slate-700 transition-colors cursor-pointer"
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* My Memo */}
        <UserMemoBox memoKey={`news:${selected.id}`} />
      </div>
    </div>
  );
}

function UserMemoBox({ memoKey }: { memoKey: string }) {
  const [memo, setMemo] = useUserMemo(memoKey);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo);

  // Sync draft when memoKey changes
  useEffect(() => {
    setDraft(memo);
    setEditing(false);
  }, [memoKey, memo]);

  function handleSave() {
    setMemo(draft);
    setEditing(false);
  }

  return (
    <div className="bg-slate-900 border border-amber-900/40 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">내 메모</h4>
        {!editing && (
          <button
            onClick={() => { setDraft(memo); setEditing(true); }}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {memo ? '수정' : '작성'}
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="이 뉴스에 대한 내 생각, 투자 판단 메모..."
            className="w-full h-24 bg-slate-800 border border-slate-700 rounded p-2 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-amber-700 transition-colors"
            autoFocus
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="text-[11px] px-2.5 py-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="text-[11px] px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-medium transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      ) : memo ? (
        <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">{memo}</p>
      ) : (
        <p className="text-[11px] text-slate-600 italic">메모가 없습니다. '작성'을 눌러 메모를 남겨보세요.</p>
      )}
    </div>
  );
}
