import type { DashboardData } from "../../types/api";

interface MarketOverviewBarProps {
  dashboard: DashboardData;
}

export function MarketOverviewBar({ dashboard }: MarketOverviewBarProps) {
  return (
    <section className="market-overview">
      <div className="market-headline">
        <p className="eyebrow">Market Summary</p>
        <h2>{dashboard.market_status}</h2>
        <p className="muted">
          마지막 브리핑 {new Date(dashboard.last_analysis_at).toLocaleString()}
        </p>
      </div>
      <div className="market-metrics">
        {dashboard.market_indicators.map((item) => (
          <article key={item.label} className="market-pill">
            <span className="muted">{item.label}</span>
            <strong>{item.value}</strong>
            <span>{item.change}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
