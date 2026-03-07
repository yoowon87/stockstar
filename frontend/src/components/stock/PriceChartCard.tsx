interface PriceChartCardProps {
  chart: Array<{
    label: string;
    close: number;
    volume: number;
  }>;
}

export function PriceChartCard({ chart }: PriceChartCardProps) {
  const maxClose = Math.max(...chart.map((point) => point.close));

  return (
    <section className="price-chart-card">
      <div className="chart-toolbar">
        <div className="period-tabs">
          {["1D", "1W", "1M", "6M", "1Y", "5Y"].map((period, index) => (
            <button
              key={period}
              type="button"
              className={index === 2 ? "period-tab period-tab-active" : "period-tab"}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-canvas">
        {chart.map((point) => (
          <div key={point.label} className="candle-column">
            <div
              className="candle-bar"
              style={{ height: `${(point.close / maxClose) * 100}%` }}
            />
            <span>{point.label}</span>
          </div>
        ))}
      </div>
      <div className="volume-row">
        {chart.map((point) => (
          <div key={`${point.label}-vol`} className="volume-column">
            <div
              className="volume-bar"
              style={{ height: `${point.volume}%` }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
