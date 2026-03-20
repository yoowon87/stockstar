import { NewsItem } from '../../types/api';
import countryGeocode from '../../../public/country_geocode.json';

interface GeoInfo { name: string; flag: string }
const geocode = countryGeocode as Record<string, GeoInfo>;

interface Props {
  news: NewsItem;
  x: number;
  y: number;
  onClose: () => void;
  onDetail: () => void;
}

export default function NewsPinPopup({ news, x, y, onClose, onDetail }: Props) {
  const originGeo = geocode[news.origin_country];
  const positiveCountries = (news.affected_countries || []).filter((c) => c.direction === 'positive');
  const negativeCountries = (news.affected_countries || []).filter((c) => c.direction === 'negative');

  // 팝업이 화면 밖으로 나가지 않도록 위치 조정
  const left = Math.min(x + 8, window.innerWidth - 280);
  const top = y - 10;

  return (
    <div
      className="absolute z-50 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-blue-400 font-semibold">
          <span>{originGeo?.flag}</span>
          <span>{news.speaker?.name || originGeo?.name || news.origin_country}</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm leading-none">✕</button>
      </div>

      {/* 제목 */}
      <p className="text-sm text-slate-100 font-medium leading-snug mb-2 line-clamp-3">
        {news.title}
      </p>

      {/* 영향 국가 */}
      {(positiveCountries.length > 0 || negativeCountries.length > 0) && (
        <div className="mb-2 space-y-1">
          {positiveCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {positiveCountries.map((c) => (
                <span key={c.country} className="text-xs px-1.5 py-0.5 rounded bg-green-900 text-green-300">
                  {geocode[c.country]?.flag} {geocode[c.country]?.name || c.country} ↑
                </span>
              ))}
            </div>
          )}
          {negativeCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {negativeCountries.map((c) => (
                <span key={c.country} className="text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-300">
                  {geocode[c.country]?.flag} {geocode[c.country]?.name || c.country} ↓
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 영향 산업 */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(news.positive_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} className="text-xs px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-300">
            {ind} ↑
          </span>
        ))}
        {(news.negative_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} className="text-xs px-1.5 py-0.5 rounded bg-orange-900 text-orange-300">
            {ind} ↓
          </span>
        ))}
      </div>

      {/* 버튼 */}
      <button
        onClick={onDetail}
        className="w-full text-xs py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
      >
        자세히 보기 →
      </button>
    </div>
  );
}
