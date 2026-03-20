import { useState, useMemo, useCallback, useRef } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { NewsItem } from '../../types/api';
import countryGeocode from '../../../public/country_geocode.json';
import NewsPinPopup from './NewsPinPopup';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO alpha-2 → ISO numeric (world-atlas 매핑)
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  US: '840', CN: '156', KR: '410', JP: '392', TW: '158',
  DE: '276', GB: '826', FR: '250', IN: '356', RU: '643',
  SA: '682', IR: '364', IL: '376', UA: '804', BR: '076',
  AU: '036', CA: '124', NL: '528', SG: '702',
};

const NUMERIC_TO_ALPHA2: Record<string, string> = {};
Object.entries(ALPHA2_TO_NUMERIC).forEach(([a, n]) => { NUMERIC_TO_ALPHA2[n] = a; });

interface GeoInfo {
  name: string;
  lat: number;
  lng: number;
  flag: string;
}

const geocode: Record<string, GeoInfo> = countryGeocode as Record<string, GeoInfo>;

export interface WorldMapProps {
  news: NewsItem[];
  onSelectNews: (news: NewsItem) => void;
  highlightedCountries?: Record<string, 'origin' | 'positive' | 'negative'>;
  activeOriginCountry?: string;
  selectedCountryFilter?: string | null;
  onPinClick?: (country: string, items: NewsItem[]) => void;
  onPinHover?: (country: string | null) => void;
  onCountryClick?: (country: string | null) => void;
}

export default function WorldMap({
  news,
  onSelectNews,
  highlightedCountries,
  activeOriginCountry,
  selectedCountryFilter,
  onPinClick,
  onPinHover,
  onCountryClick,
}: WorldMapProps) {
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([15, 10]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      return Math.min(8, Math.max(1, prev + delta));
    });
  }, []);

  // 발생국별 뉴스 그룹핑
  const newsByOrigin = useMemo(() => {
    const map: Record<string, NewsItem[]> = {};
    news.forEach((n) => {
      const key = n.origin_country || 'US';
      if (!map[key]) map[key] = [];
      map[key].push(n);
    });
    return map;
  }, [news]);

  // 수혜/피해 국가 집계 (base coloring)
  const countryEffect = useMemo(() => {
    const effect: Record<string, 'positive' | 'negative' | 'both'> = {};
    news.forEach((n) => {
      (n.affected_countries || []).forEach((ac) => {
        const cur = effect[ac.country];
        if (!cur) {
          effect[ac.country] = ac.direction === 'positive' ? 'positive' : 'negative';
        } else if (cur !== ac.direction) {
          effect[ac.country] = 'both';
        }
      });
    });
    return effect;
  }, [news]);

  // Build arcs: origin → affected country connections (filtered by selectedCountryFilter)
  const arcs = useMemo(() => {
    const lines: Array<{
      from: [number, number];
      to: [number, number];
      direction: 'positive' | 'negative' | 'neutral';
      key: string;
    }> = [];
    const seen = new Set<string>();

    news.forEach((n) => {
      // If a country filter is active, only show arcs for that country's news
      if (selectedCountryFilter && n.origin_country !== selectedCountryFilter) return;

      const originGeo = geocode[n.origin_country];
      if (!originGeo) return;

      (n.affected_countries || []).forEach((ac) => {
        const targetGeo = geocode[ac.country];
        if (!targetGeo) return;
        if (n.origin_country === ac.country) return;

        const key = `${n.origin_country}-${ac.country}-${ac.direction}`;
        if (seen.has(key)) return;
        seen.add(key);

        lines.push({
          from: [originGeo.lng, originGeo.lat],
          to: [targetGeo.lng, targetGeo.lat],
          direction: ac.direction as 'positive' | 'negative' | 'neutral',
          key,
        });
      });
    });
    return lines;
  }, [news, selectedCountryFilter]);

  function getCountryFill(numericId: string): string {
    const alpha2 = NUMERIC_TO_ALPHA2[numericId];
    if (!alpha2) return '#1e293b';

    // Highlight override from parent (hover/active)
    if (highlightedCountries) {
      const hl = highlightedCountries[alpha2];
      if (hl === 'origin') return 'rgba(59,130,246,0.5)';
      if (hl === 'positive') return 'rgba(34,197,94,0.55)';
      if (hl === 'negative') return 'rgba(239,68,68,0.55)';
    }

    const effect = countryEffect[alpha2];
    if (effect === 'positive') return 'rgba(34,197,94,0.25)';
    if (effect === 'negative') return 'rgba(239,68,68,0.25)';
    if (effect === 'both') return 'rgba(251,191,36,0.25)';
    return '#1e293b';
  }

  function handlePinClick(
    e: React.MouseEvent,
    countryCode: string,
    newsList: NewsItem[]
  ) {
    e.stopPropagation();
    // Toggle country filter
    if (onCountryClick) {
      onCountryClick(selectedCountryFilter === countryCode ? null : countryCode);
    }
    if (onPinClick) {
      onPinClick(countryCode, newsList);
      return;
    }
    const rect = (e.currentTarget as SVGElement)
      .closest('svg')
      ?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0);
    const y = e.clientY - (rect?.top ?? 0);
    setPopupPos({ x, y });
    setSelectedNews(newsList[0]);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-900 overflow-hidden"
      onClick={() => { setSelectedNews(null); setPopupPos(null); onCountryClick?.(null); }}
      onWheel={handleWheel}
    >
      <ComposableMap
        projectionConfig={{ scale: 147, center: [15, 10] }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          minZoom={1}
          maxZoom={8}
          onMoveEnd={({ coordinates, zoom: z }: { coordinates: [number, number]; zoom: number }) => {
            setCenter(coordinates);
            setZoom(z);
          }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getCountryFill(geo.id)}
                  stroke="#334155"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none', cursor: NUMERIC_TO_ALPHA2[geo.id] ? 'pointer' : 'default' },
                    hover: { fill: NUMERIC_TO_ALPHA2[geo.id] ? '#475569' : '#334155', outline: 'none', cursor: NUMERIC_TO_ALPHA2[geo.id] ? 'pointer' : 'default' },
                    pressed: { outline: 'none' },
                  }}
                  onClick={(e: any) => {
                    const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
                    if (alpha2 && onCountryClick) {
                      e.stopPropagation();
                      onCountryClick(selectedCountryFilter === alpha2 ? null : alpha2);
                    }
                  }}
                />
              ))
            }
          </Geographies>

          {/* Connection arcs: origin → affected countries */}
          {arcs.map((arc) => (
            <Line
              key={arc.key}
              from={arc.from}
              to={arc.to}
              stroke={
                arc.direction === 'positive'
                  ? 'rgba(34,197,94,0.45)'
                  : arc.direction === 'negative'
                  ? 'rgba(239,68,68,0.45)'
                  : 'rgba(148,163,184,0.2)'
              }
              strokeWidth={0.8 / zoom}
              strokeLinecap="round"
              strokeDasharray={`${3 / zoom} ${2 / zoom}`}
              style={{
                pointerEvents: 'none',
              }}
            />
          ))}

          {Object.entries(newsByOrigin).map(([code, newsList]) => {
            const geo = geocode[code];
            if (!geo) return null;
            const count = newsList.length;
            const s = 1 / zoom; // scale factor inversely proportional to zoom
            const r = Math.min(2.5 + count * 0.5, 5) * s;
            const isActive = activeOriginCountry === code;
            const isFiltered = selectedCountryFilter != null;
            const isSelectedCountry = selectedCountryFilter === code;
            const pinOpacity = isFiltered && !isSelectedCountry ? 0.25 : 0.9;
            return (
              <Marker key={code} coordinates={[geo.lng, geo.lat]}>
                {/* Pulse ring for active */}
                {isActive && (
                  <circle r={(r + 3 * s)} fill="none" stroke="#60a5fa" strokeWidth={1 * s} opacity={0.5}>
                    <animate attributeName="r" from={String(r + 1 * s)} to={String(r + 6 * s)} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Glow */}
                <circle
                  r={r + 1.5 * s}
                  fill={isActive ? '#3b82f6' : '#60a5fa'}
                  fillOpacity={0.2}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Main dot */}
                <circle
                  r={r}
                  fill={isSelectedCountry ? '#f59e0b' : isActive ? '#3b82f6' : '#38bdf8'}
                  fillOpacity={pinOpacity}
                  stroke="#fff"
                  strokeWidth={0.5 * s}
                  style={{ cursor: 'pointer', filter: `drop-shadow(0 0 ${2 * s}px rgba(56,189,248,0.6))` }}
                  onClick={(e) => handlePinClick(e as unknown as React.MouseEvent, code, newsList)}
                  onMouseEnter={() => onPinHover?.(code)}
                  onMouseLeave={() => onPinHover?.(null)}
                />
                {/* Count label - only show if more than 1 */}
                {count > 1 && (
                  <text
                    textAnchor="middle"
                    y={(-r - 2 * s)}
                    style={{ fontSize: 5 * s, fill: '#94a3b8', pointerEvents: 'none', fontWeight: 600 }}
                  >
                    {count}
                  </text>
                )}
                {/* Country code label */}
                <text
                  textAnchor="middle"
                  y={r + 5 * s}
                  style={{ fontSize: 3.5 * s, fill: '#64748b', pointerEvents: 'none', fontWeight: 500, letterSpacing: `${0.5 * s}px` }}
                >
                  {code}
                </text>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* 범례 */}
      <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> 뉴스 발생
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded" style={{ background: 'rgba(34,197,94,0.8)' }} /> 상승 영향
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 rounded" style={{ background: 'rgba(239,68,68,0.8)' }} /> 하락 영향
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded" style={{ background: 'rgba(34,197,94,0.3)' }} /> 수혜국
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded" style={{ background: 'rgba(239,68,68,0.3)' }} /> 피해국
        </span>
      </div>

      {/* 팝업 (only when no external onPinClick handler) */}
      {selectedNews && popupPos && !onPinClick && (
        <NewsPinPopup
          news={selectedNews}
          x={popupPos.x}
          y={popupPos.y}
          onClose={() => { setSelectedNews(null); setPopupPos(null); }}
          onDetail={() => { onSelectNews(selectedNews); setSelectedNews(null); }}
        />
      )}
    </div>
  );
}
