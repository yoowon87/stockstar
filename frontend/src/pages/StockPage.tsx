import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { stockUniverse, categoryDefinitions } from "../data/mockInvestmentData";
import { getNewsList } from "../services/api";
import { fetchStockQuotes } from "../services/backendApi";
import { useUserMemo } from "../hooks/useMemo";
import type { NewsItem } from "../types/api";
import type { StockRecord } from "../types/ui";

const WATCHLIST_KEY = "stockstar_watchlist";

function loadWatchlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(list: string[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

export function StockPage() {
  const navigate = useNavigate();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>("all");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, any>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);

  useEffect(() => {
    getNewsList().then(setNewsItems).catch(console.error);
  }, []);

  // Fetch real-time quotes on mount
  useEffect(() => {
    const symbols = stockUniverse.map((s) => s.symbol);
    setQuotesLoading(true);
    fetchStockQuotes(symbols)
      .then(setLiveQuotes)
      .catch(() => {}) // fallback: use mock data
      .finally(() => setQuotesLoading(false));
  }, []);

  // Merge live quotes into stock data
  function getStockWithLive(stock: StockRecord): StockRecord {
    const live = liveQuotes[stock.symbol];
    if (!live || live.error) return stock;
    return {
      ...stock,
      currentPriceLabel: live.currency === "KRW"
        ? "₩" + Number(live.price).toLocaleString()
        : "$" + live.price,
      changeRate: (live.change_pct >= 0 ? "+" : "") + live.change_pct + "%",
      marketCapLabel: live.market_cap_label || stock.marketCapLabel,
      volumeLabel: live.volume_label || stock.volumeLabel,
      chart: live.chart && live.chart.length > 0
        ? live.chart.map((c: any) => ({ label: c.date, close: c.close, volume: c.volume }))
        : stock.chart,
    };
  }

  // Group stocks by category/theme
  const themeGroups = useMemo(() => {
    return categoryDefinitions
      .filter((cat) => cat.id !== "cash")
      .map((cat) => ({
        ...cat,
        stocks: stockUniverse.filter((s) => s.categoryIds.includes(cat.id)),
      }));
  }, []);

  // Watchlist stocks
  const watchlistStocks = useMemo(
    () => stockUniverse.filter((s) => watchlist.includes(s.symbol)),
    [watchlist]
  );

  // Filtered stocks (with live data merged)
  const displayStocks = useMemo(() => {
    let base: StockRecord[];
    if (activeTheme === "watchlist") base = watchlistStocks;
    else if (activeTheme === "all") base = stockUniverse;
    else base = stockUniverse.filter((s) => s.categoryIds.includes(activeTheme));
    return base.map(getStockWithLive);
  }, [activeTheme, watchlistStocks, liveQuotes]);

  const selected = useMemo(() => {
    const base = stockUniverse.find((s) => s.symbol === selectedSymbol) ?? null;
    return base ? getStockWithLive(base) : null;
  }, [selectedSymbol, liveQuotes]);

  const relatedNews = useMemo(() => {
    if (!selected) return [];
    return newsItems.filter((n) => n.related_symbols.includes(selected.symbol)).slice(0, 3);
  }, [newsItems, selected]);

  function toggleWatchlist(symbol: string) {
    setWatchlist((prev) => {
      const next = prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];
      saveWatchlist(next);
      return next;
    });
  }

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Left: Theme tabs + Stock grid */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Theme tabs + refresh */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800 overflow-x-auto flex-shrink-0">
          <ThemeTab
            label="전체"
            count={stockUniverse.length}
            active={activeTheme === "all"}
            onClick={() => setActiveTheme("all")}
          />
          <ThemeTab
            label={`관심 ${watchlist.length}`}
            count={watchlist.length}
            active={activeTheme === "watchlist"}
            onClick={() => setActiveTheme("watchlist")}
            accent="#f59e0b"
          />
          <span className="w-px h-4 bg-slate-700 mx-1 flex-shrink-0" />
          {themeGroups.map((g) => (
            <ThemeTab
              key={g.id}
              label={g.label}
              count={g.stocks.length}
              active={activeTheme === g.id}
              onClick={() => setActiveTheme(g.id)}
              accent={g.accent}
            />
          ))}
        </div>

        {/* Active theme info */}
        {activeTheme !== "all" && activeTheme !== "watchlist" && (
          <div className="px-4 py-1.5 border-b border-slate-800 bg-slate-900/50">
            <span className="text-[11px] text-slate-400">
              {categoryDefinitions.find((c) => c.id === activeTheme)?.description}
            </span>
          </div>
        )}

        {/* Stock grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {displayStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2">
              <span>관심 종목이 없습니다</span>
              <span className="text-[11px] text-slate-700">종목 옆 ☆를 눌러 추가하세요</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {displayStocks.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  isWatched={watchlist.includes(stock.symbol)}
                  isSelected={selectedSymbol === stock.symbol}
                  onSelect={() => setSelectedSymbol(stock.symbol === selectedSymbol ? null : stock.symbol)}
                  onToggleWatch={() => toggleWatchlist(stock.symbol)}
                  themeGroups={themeGroups}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Detail panel (shown when a stock is selected) */}
      {selected && (
        <div className="w-[340px] flex-shrink-0 border-l border-slate-800 bg-[#0b1220] overflow-y-auto news-panel-scroll">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{selected.market}</span>
                  <span className="text-[10px] text-slate-600">{selected.symbol}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{selected.name}</h3>
              </div>
              <button
                onClick={() => setSelectedSymbol(null)}
                className="text-slate-600 hover:text-slate-400 text-sm"
              >✕</button>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl font-bold text-white">{selected.currentPriceLabel}</span>
              <span className={`text-sm font-bold ${selected.changeRate.startsWith('-') ? 'text-red-400' : 'text-green-400'}`}>
                {selected.changeRate}
              </span>
            </div>

            {/* Mini chart */}
            <div className="flex items-end gap-1 h-12 mb-4 px-1">
              {selected.chart.map((d, i) => {
                const max = Math.max(...selected.chart.map((c) => c.close));
                const min = Math.min(...selected.chart.map((c) => c.close));
                const range = max - min || 1;
                const h = ((d.close - min) / range) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-blue-500/40"
                    style={{ height: `${Math.max(h, 8)}%` }}
                  />
                );
              })}
            </div>

            {/* Score + Marketcap + Volume */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-slate-900 rounded p-2 text-center">
                <div className="text-[10px] text-slate-500 mb-0.5">Score</div>
                <div className="text-sm font-bold text-blue-400">{selected.score}</div>
              </div>
              <div className="bg-slate-900 rounded p-2 text-center">
                <div className="text-[10px] text-slate-500 mb-0.5">시총</div>
                <div className="text-[11px] font-bold text-slate-300">{selected.marketCapLabel}</div>
              </div>
              <div className="bg-slate-900 rounded p-2 text-center">
                <div className="text-[10px] text-slate-500 mb-0.5">거래량</div>
                <div className="text-[11px] font-bold text-slate-300">{selected.volumeLabel}</div>
              </div>
            </div>

            {/* Thesis */}
            <div className="mb-4">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">투자 논리</h4>
              <p className="text-[12px] text-slate-300 leading-relaxed">{selected.thesis}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {selected.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>

            {/* Holding info */}
            {selected.holding.owned && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">보유 현황</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">평균단가</div>
                    <div className="text-[11px] font-bold text-slate-300">{selected.holding.averagePrice}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">비중</div>
                    <div className="text-[11px] font-bold text-slate-300">{selected.holding.allocation}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">손익</div>
                    <div className="text-[11px] font-bold text-green-400">{selected.holding.profitLoss}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Related news */}
            {relatedNews.length > 0 && (
              <div className="mb-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">관련 뉴스</h4>
                <div className="space-y-1">
                  {relatedNews.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => navigate(`/news/${n.id}`)}
                      className="w-full text-left px-2 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] text-slate-300 truncate">{n.title}</div>
                      <div className="text-[10px] text-slate-600">{n.source}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* My Memo */}
            <StockMemoBox symbol={selected.symbol} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function ThemeTab({
  label, count, active, onClick, accent,
}: {
  label: string; count: number; active: boolean; onClick: () => void; accent?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex-shrink-0 cursor-pointer ${
        active
          ? 'bg-slate-700 text-white'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
      }`}
    >
      {accent && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
      )}
      {label}
      <span className="text-[10px] text-slate-600">{count}</span>
    </button>
  );
}

function StockCard({
  stock, isWatched, isSelected, onSelect, onToggleWatch, themeGroups,
}: {
  stock: StockRecord;
  isWatched: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleWatch: () => void;
  themeGroups: Array<{ id: string; label: string; accent: string }>;
}) {
  const isUp = !stock.changeRate.startsWith("-");

  return (
    <div
      className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-950/30'
          : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/60'
      }`}
      onClick={onSelect}
    >
      {/* Watchlist star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatch(); }}
        className={`absolute top-2 right-2 text-sm transition-colors ${
          isWatched ? 'text-yellow-400' : 'text-slate-700 hover:text-slate-500'
        }`}
      >
        {isWatched ? '★' : '☆'}
      </button>

      {/* Header: name + symbol */}
      <div className="mb-1.5 pr-5">
        <div className="text-[13px] font-bold text-slate-100 truncate">{stock.name}</div>
        <div className="text-[10px] text-slate-500">{stock.symbol} · {stock.market}</div>
      </div>

      {/* Price + Change */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-sm font-bold text-white">{stock.currentPriceLabel}</span>
        <span className={`text-[11px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {stock.changeRate}
        </span>
      </div>

      {/* Mini chart bar */}
      <div className="flex items-end gap-px h-6 mb-2">
        {stock.chart.map((d, i) => {
          const max = Math.max(...stock.chart.map((c) => c.close));
          const min = Math.min(...stock.chart.map((c) => c.close));
          const range = max - min || 1;
          const h = ((d.close - min) / range) * 100;
          return (
            <div
              key={i}
              className={`flex-1 rounded-t ${isUp ? 'bg-green-500/30' : 'bg-red-500/30'}`}
              style={{ height: `${Math.max(h, 10)}%` }}
            />
          );
        })}
      </div>

      {/* Bottom: score + theme tags + holding */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-bold">
          {stock.score}
        </span>
        {stock.categoryIds.map((catId) => {
          const theme = themeGroups.find((t) => t.id === catId);
          if (!theme) return null;
          return (
            <span
              key={catId}
              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700"
              style={{ color: theme.accent, borderColor: theme.accent + '40', background: theme.accent + '15' }}
            >
              {theme.label}
            </span>
          );
        })}
        {stock.holding.owned && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-bold ml-auto">
            보유중
          </span>
        )}
      </div>
    </div>
  );
}

function StockMemoBox({ symbol }: { symbol: string }) {
  const [memo, setMemo] = useUserMemo(`stock:${symbol}`);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo);

  useEffect(() => {
    setDraft(memo);
    setEditing(false);
  }, [symbol, memo]);

  function handleSave() {
    setMemo(draft);
    setEditing(false);
  }

  return (
    <div className="bg-slate-900 border border-amber-900/40 rounded-lg p-3">
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
            placeholder="이 종목에 대한 내 판단, 매매 전략 메모..."
            className="w-full h-20 bg-slate-800 border border-slate-700 rounded p-2 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-amber-700 transition-colors"
            autoFocus
          />
          <div className="flex gap-2 mt-1.5 justify-end">
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
        <p className="text-[11px] text-slate-600 italic">메모가 없습니다</p>
      )}
    </div>
  );
}
