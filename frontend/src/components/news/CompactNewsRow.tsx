import { NewsItem } from '../../types/api';
import countryGeocode from '../../../public/country_geocode.json';

interface GeoInfo { name: string; flag: string }
const geocode = countryGeocode as Record<string, GeoInfo>;

const IMPORTANCE_STARS: Record<string, string> = {
  high: '★★★',
  medium: '★★',
  low: '★',
};

interface Props {
  news: NewsItem;
  index: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function CompactNewsRow({ news, index, isActive, onSelect, onHover }: Props) {
  const originGeo = geocode[news.origin_country];
  const stars = IMPORTANCE_STARS[news.importance] ?? '★★';

  const timeAgo = (() => {
    const diff = Date.now() - new Date(news.published_at).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return `${Math.floor(diff / 60_000)}분`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  })();

  return (
    <div
      className={`news-row ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(news.id)}
      onMouseEnter={() => onHover(news.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Line 1: rank, stars, speaker, time */}
      <div className="flex items-center gap-1.5 text-[11px] leading-none mb-0.5">
        <span className="text-slate-500 font-bold w-5">#{index + 1}</span>
        <span className="text-yellow-500">{stars}</span>
        <span className="text-slate-500">|</span>
        <span>{originGeo?.flag ?? '🌐'}</span>
        <span className="text-blue-400 truncate flex-1">{news.speaker?.name || originGeo?.name || news.origin_country}</span>
        <span className="text-slate-600 flex-shrink-0">{timeAgo}</span>
        {news.importance === 'high' && (
          <span className="px-1 py-px rounded text-[9px] bg-red-900/60 text-red-300 font-bold flex-shrink-0">HIGH</span>
        )}
      </div>

      {/* Line 2: title */}
      <div className="text-[12px] text-slate-200 leading-snug truncate pl-5 mb-0.5">
        {news.title}
      </div>

      {/* Line 3: industries + affected countries */}
      <div className="flex items-center gap-1 pl-5 text-[10px] leading-none flex-wrap">
        {(news.positive_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} className="text-emerald-400">{ind}↑</span>
        ))}
        {(news.negative_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} className="text-red-400">{ind}↓</span>
        ))}
        {(news.positive_industries.length > 0 || news.negative_industries.length > 0) &&
          (news.affected_countries || []).length > 0 && (
            <span className="text-slate-700">|</span>
          )}
        {(news.affected_countries || []).slice(0, 4).map((ac) => (
          <span
            key={ac.country}
            className={ac.direction === 'positive' ? 'text-green-400' : ac.direction === 'negative' ? 'text-red-400' : 'text-slate-500'}
          >
            {geocode[ac.country]?.flag}{ac.direction === 'positive' ? '+' : ac.direction === 'negative' ? '-' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
