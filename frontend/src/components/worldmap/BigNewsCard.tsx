import { NewsItem } from '../../types/api';
import countryGeocode from '../../../public/country_geocode.json';

interface GeoInfo { name: string; flag: string }
const geocode = countryGeocode as Record<string, GeoInfo>;

const IMPORTANCE_STARS: Record<string, number> = { high: 5, medium: 3, low: 1 };

interface Props {
  news: NewsItem;
  index: number;
  onClick: () => void;
}

export default function BigNewsCard({ news, index, onClick }: Props) {
  const originGeo = geocode[news.origin_country];
  const stars = IMPORTANCE_STARS[news.importance] ?? 3;
  const hasPositive = (news.positive_industries || []).length > 0;
  const hasNegative = (news.negative_industries || []).length > 0;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(news.published_at).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return `${Math.floor(diff / 60_000)}분 전`;
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  })();

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-52 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500 rounded-xl p-3 text-left transition-all duration-150 cursor-pointer group"
    >
      {/* 순번 + 국가 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span>{originGeo?.flag ?? '🌐'}</span>
          <span>{news.speaker?.name || originGeo?.name || news.origin_country}</span>
        </div>
      </div>

      {/* 제목 */}
      <p className="text-sm text-slate-100 font-medium leading-snug mb-2 line-clamp-3 group-hover:text-blue-200 transition-colors">
        {news.title}
      </p>

      {/* 산업 태그 */}
      <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
        {hasPositive && (news.positive_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
            ↑ {ind}
          </span>
        ))}
        {hasNegative && (news.negative_industries || []).slice(0, 1).map((ind) => (
          <span key={ind} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-900/60 text-red-300 border border-red-700/50">
            ↓ {ind}
          </span>
        ))}
      </div>

      {/* 중요도 + 시간 */}
      <div className="flex items-center justify-between">
        <span className="text-yellow-400 text-xs tracking-tighter">
          {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
        </span>
        <span className="text-xs text-slate-500">{timeAgo}</span>
      </div>
    </button>
  );
}
