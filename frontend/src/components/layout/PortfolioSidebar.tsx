import type { PortfolioSummary } from "../../types/ui";

interface PortfolioSidebarProps {
  portfolio: PortfolioSummary;
}

export function PortfolioSidebar({ portfolio }: PortfolioSidebarProps) {
  const gradientStops = portfolio.slices
    .map((slice, index) => {
      const start = portfolio.slices
        .slice(0, index)
        .reduce((sum, current) => sum + current.weight, 0);
      return `${slice.color} ${start}% ${start + slice.weight}%`;
    })
    .join(", ");

  return (
    <aside className="portfolio-sidebar">
      <div className="sidebar-section">
        <p className="eyebrow">Portfolio</p>
        <h1>투자 대시보드</h1>
        <p className="sidebar-copy">
          자산 구조와 카테고리 비중을 한 화면에서 확인하는 개인용 리서치 패널입니다.
        </p>
      </div>

      <div className="sidebar-section asset-card">
        <div className="donut-wrap">
          <div
            className="donut-chart"
            style={{
              background: `conic-gradient(${gradientStops})`,
            }}
          >
            <div className="donut-center">
              <span>총자산</span>
              <strong>{portfolio.totalAsset}</strong>
            </div>
          </div>
        </div>
        <div className="asset-stats">
          <div>
            <span className="muted">투자금</span>
            <strong>{portfolio.invested}</strong>
          </div>
          <div>
            <span className="muted">현금</span>
            <strong>{portfolio.cash}</strong>
          </div>
          <div>
            <span className="muted">평가손익</span>
            <strong className="up">
              {portfolio.profitLoss} ({portfolio.profitLossRate})
            </strong>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h2 className="sidebar-title">카테고리 비중</h2>
        <div className="stack">
          {portfolio.slices.map((slice) => (
            <div key={slice.id} className="allocation-card">
              <div className="allocation-header">
                <strong>{slice.label}</strong>
                <span className="muted">{slice.weight}%</span>
              </div>
              <div className="allocation-bar">
                <div
                  className="allocation-fill"
                  style={{ width: `${slice.weight}%`, background: slice.color }}
                />
              </div>
              <span className="muted">{slice.amountLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
