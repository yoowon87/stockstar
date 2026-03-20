import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import WorldMap from '../components/worldmap/WorldMap';
import CompactNewsRow from '../components/news/CompactNewsRow';
import { getNewsList } from '../services/api';
import { fetchBackendNews, fetchRegions, collectRegionNews } from '../services/backendApi';
import { broadcastNewsUpdate, useNewsSync } from '../hooks/useNewsSync';
import type { NewsItem } from '../types/api';

const IMPORTANCE_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

function pickBigNews(news: NewsItem[]): NewsItem[] {
  return [...news]
    .sort((a, b) => {
      const imp = (IMPORTANCE_ORDER[b.importance] ?? 1) - (IMPORTANCE_ORDER[a.importance] ?? 1);
      if (imp !== 0) return imp;
      return b.published_at.localeCompare(a.published_at);
    })
    .slice(0, 10);
}

export function HomePage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNewsId, setActiveNewsId] = useState<string | null>(null);
  const [hoveredNewsId, setHoveredNewsId] = useState<string | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectProgress, setCollectProgress] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const newsListRef = useRef<HTMLDivElement>(null);

  // Load news: backend first, fallback to Firebase
  useEffect(() => {
    fetchBackendNews()
      .then((list) => {
        if (list.length > 0) {
          setNews(list);
        } else {
          return getNewsList().then((fbList) => setNews(fbList));
        }
      })
      .catch(() => getNewsList().then((fbList) => setNews(fbList)))
      .finally(() => setLoading(false));
  }, []);

  // Reload news when another page collects
  const reloadNews = useCallback(() => {
    fetchBackendNews()
      .then((list) => { if (list.length > 0) setNews(list); })
      .catch(() => {});
  }, []);
  useNewsSync(reloadNews);

  const bigNews = useMemo(() => pickBigNews(news), [news]);

  // Filtered news by selected country
  const displayNews = useMemo(() => {
    if (!selectedCountry) return bigNews;
    return news.filter((n) => n.origin_country === selectedCountry)
      .sort((a, b) => b.published_at.localeCompare(a.published_at));
  }, [news, bigNews, selectedCountry]);

  // Build highlighted countries map from active/hovered news
  const focusedNewsId = hoveredNewsId ?? activeNewsId;
  const focusedItem = useMemo(
    () => bigNews.find((n) => n.id === focusedNewsId) ?? null,
    [bigNews, focusedNewsId]
  );

  const highlightedCountries = useMemo(() => {
    if (!focusedItem) return undefined;
    const map: Record<string, 'origin' | 'positive' | 'negative'> = {};
    if (focusedItem.origin_country) {
      map[focusedItem.origin_country] = 'origin';
    }
    (focusedItem.affected_countries || []).forEach((ac) => {
      if (ac.direction === 'positive') map[ac.country] = 'positive';
      else if (ac.direction === 'negative') map[ac.country] = 'negative';
    });
    return map;
  }, [focusedItem]);

  const activeOriginCountry = focusedItem?.origin_country;

  // Map pin click → filter news by country
  const handlePinClick = useCallback((country: string, _items: NewsItem[]) => {
    setSelectedCountry((prev) => prev === country ? null : country);
    setActiveNewsId(null);
  }, []);

  // Country click on map (geography or pin)
  const handleCountryClick = useCallback((country: string | null) => {
    setSelectedCountry(country);
    setActiveNewsId(null);
  }, []);

  // Map pin hover → highlight matching news
  const handlePinHover = useCallback((country: string | null) => {
    if (!country) {
      setHoveredNewsId(null);
      return;
    }
    const item = bigNews.find((n) => n.origin_country === country);
    if (item) setHoveredNewsId(item.id);
  }, [bigNews]);

  async function handleCollect() {
    setIsCollecting(true);
    setCollectProgress("");
    try {
      const regions = await fetchRegions();
      for (let i = 0; i < regions.length; i++) {
        setCollectProgress(`${regions[i].code} (${i + 1}/${regions.length})`);
        await collectRegionNews(regions[i].code);
      }
      setCollectProgress("");
      const backendNews = await fetchBackendNews();
      if (backendNews.length > 0) setNews(backendNews);
      else {
        const fbNews = await getNewsList();
        setNews(fbNews);
      }
      broadcastNewsUpdate();
    } catch (e) {
      console.error("Collection failed:", e);
    } finally {
      setIsCollecting(false);
    }
  }

  function handleSelectNews(id: string) {
    navigate(`/news/${id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950">
        <span className="text-slate-500 text-sm">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="home-split-layout">
      {/* Left: World Map (65%) */}
      <div className="home-map-pane">
        <WorldMap
          news={news}
          onSelectNews={(n) => handleSelectNews(n.id)}
          highlightedCountries={highlightedCountries}
          activeOriginCountry={activeOriginCountry}
          selectedCountryFilter={selectedCountry}
          onPinClick={handlePinClick}
          onPinHover={handlePinHover}
          onCountryClick={handleCountryClick}
        />
      </div>

      {/* Right: News Panel (35%) */}
      <div className="news-panel">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
              {selectedCountry ? `${selectedCountry} 뉴스` : '빅뉴스'} {displayNews.length}
            </span>
            {selectedCountry && (
              <button
                onClick={() => setSelectedCountry(null)}
                className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                ✕ 필터 해제
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[10px] px-2 py-0.5 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-medium transition-colors"
              onClick={handleCollect}
              disabled={isCollecting}
            >
              {isCollecting ? (collectProgress || "수집 중...") : "🌐 수집"}
            </button>
            <button
              onClick={() => navigate('/news')}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              전체 →
            </button>
          </div>
        </div>
        <div ref={newsListRef} className="news-panel-scroll">
          {displayNews.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              {selectedCountry ? `${selectedCountry} 뉴스가 없습니다` : '뉴스가 없습니다'}
            </div>
          ) : (
            displayNews.map((item, i) => (
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
