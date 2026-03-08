import { Link } from "react-router-dom";

import type { NewsItem } from "../../types/api";
import type { StockRecord } from "../../types/ui";
import { PriceChartCard } from "./PriceChartCard";

interface StockDetailPanelProps {
  stock: StockRecord;
  relatedNews: NewsItem[];
  compact?: boolean;
}

export function StockDetailPanel({
  stock,
  relatedNews,
  compact = false,
}: StockDetailPanelProps) {
  return (
    <aside className={compact ? "detail-panel detail-panel-compact" : "detail-panel"}>
      <div className="detail-panel-header">
        <div>
          <p className="eyebrow">{stock.market}</p>
          <h3>{stock.name}</h3>
          <p className="muted">
            {stock.symbol} · {stock.marketCapLabel} · 거래량 {stock.volumeLabel}
          </p>
        </div>
        <div className="detail-price">
          <strong>{stock.currentPriceLabel}</strong>
          <span className={stock.changeRate.startsWith("-") ? "down" : "up"}>
            {stock.changeRate}
          </span>
        </div>
      </div>

      <PriceChartCard chart={stock.chart} />

      <div className="detail-grid">
        <section className="detail-card">
          <h4>종목 설명</h4>
          <p>{stock.description}</p>
          <p className="muted">{stock.thesis}</p>
        </section>

        <section className="detail-card">
          <h4>카테고리 편입 이유</h4>
          <p>{stock.categoryReason}</p>
          <div className="tag-row">
            {stock.tags.map((tag) => (
              <span key={tag} className="mini-tag">
                {tag}
              </span>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <h4>내 보유 정보</h4>
          {stock.holding.owned ? (
            <div className="holding-grid">
              <div>
                <span className="muted">평균 단가</span>
                <strong>{stock.holding.averagePrice}</strong>
              </div>
              <div>
                <span className="muted">비중</span>
                <strong>{stock.holding.allocation}</strong>
              </div>
              <div>
                <span className="muted">평가손익</span>
                <strong className="up">{stock.holding.profitLoss}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">
              현재 보유 중이 아닌 종목입니다. 관심종목 후보로 검토 중입니다.
            </p>
          )}
        </section>

        <section className="detail-card">
          <h4>관련 뉴스</h4>
          <div className="stack">
            {relatedNews.slice(0, 3).map((item) => (
              <Link key={item.id} to={`/news/${item.id}`} className="detail-news-link">
                <strong>{item.title}</strong>
                <span className="muted">{item.source}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
