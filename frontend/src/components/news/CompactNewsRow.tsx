import { NewsItem } from '../../types/api';
import countryGeocode from '../../../public/country_geocode.json';

interface GeoInfo { name: string; flag: string }
const geocode = countryGeocode as Record<string, GeoInfo>;

const IMPORTANCE_DOTS: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
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
  const dots = IMPORTANCE_DOTS[news.importance] ?? 2;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(news.published_at).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return `${Math.floor(diff / 60_000)}m`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  })();

  return (
    <div
      className={`news-row ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(news.id)}
      onMouseEnter={() => onHover(news.id)}
      onMouseLeave={() => onHover(null)}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Line 1: rank, importance, speaker, time */}
      <div className="flex items-center gap-1.5 leading-none mb-1" style={{ fontSize: 11 }}>
        <span
          className="font-mono font-bold w-5 text-center"
          style={{ color: "var(--text-muted)", fontSize: 10 }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Importance dots */}
        <span className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-1 h-1 rounded-full"
              style={{
                background: i < dots
                  ? dots === 3 ? "var(--down)" : "var(--gold)"
                  : "rgba(212, 165, 116, 0.1)",
              }}
            />
          ))}
        </span>

        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>|</span>
        <span>{originGeo?.flag ?? '\u{1F310}'}</span>
        <span
          className="truncate flex-1"
          style={{ color: "var(--gold-dim)", fontFamily: "DM Sans", fontWeight: 500 }}
        >
          {news.speaker?.name || originGeo?.name || news.origin_country}
        </span>
        <span
          className="font-mono flex-shrink-0"
          style={{ color: "var(--text-muted)", fontSize: 10 }}
        >
          {timeAgo}
        </span>
        {news.importance === 'high' && (
          <span
            className="flex-shrink-0 font-mono font-bold"
            style={{
              fontSize: 8,
              padding: "1px 5px",
              borderRadius: 4,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "var(--down)",
              letterSpacing: "0.05em",
            }}
          >
            HIGH
          </span>
        )}
      </div>

      {/* Line 2: title */}
      <div
        className="truncate pl-5 mb-0.5"
        style={{
          fontSize: 12,
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: isActive ? 600 : 400,
          lineHeight: 1.4,
          transition: "color 160ms",
        }}
      >
        {news.title}
      </div>

      {/* Line 3: industries + affected countries */}
      <div className="flex items-center gap-1.5 pl-5 flex-wrap" style={{ fontSize: 10, lineHeight: 1 }}>
        {(news.positive_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} style={{ color: "var(--up)" }}>{ind}\u2191</span>
        ))}
        {(news.negative_industries || []).slice(0, 2).map((ind) => (
          <span key={ind} style={{ color: "var(--down)" }}>{ind}\u2193</span>
        ))}
        {(news.positive_industries.length > 0 || news.negative_industries.length > 0) &&
          (news.affected_countries || []).length > 0 && (
            <span style={{ color: "var(--border-default)" }}>|</span>
          )}
        {(news.affected_countries || []).slice(0, 4).map((ac) => (
          <span
            key={ac.country}
            style={{
              color: ac.direction === 'positive' ? 'var(--up)' : ac.direction === 'negative' ? 'var(--down)' : 'var(--text-muted)',
            }}
          >
            {geocode[ac.country]?.flag}{ac.direction === 'positive' ? '+' : ac.direction === 'negative' ? '-' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
