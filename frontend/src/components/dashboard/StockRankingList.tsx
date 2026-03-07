import type { StockRecord } from "../../types/ui";

interface StockRankingListProps {
  stocks: StockRecord[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

export function StockRankingList({
  stocks,
  selectedSymbol,
  onSelect,
}: StockRankingListProps) {
  return (
    <section className="content-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">추천 종목</p>
          <h3>카테고리 우선순위</h3>
        </div>
      </div>
      <div className="stack">
        {stocks.map((stock, index) => (
          <button
            key={stock.symbol}
            type="button"
            className={
              stock.symbol === selectedSymbol
                ? "ranking-row ranking-row-active"
                : "ranking-row"
            }
            onClick={() => onSelect(stock.symbol)}
          >
            <div className="ranking-index">{index + 1}</div>
            <div className="list-item-body">
              <div className="ranking-topline">
                <strong>{stock.name}</strong>
                <span className={stock.changeRate.startsWith("-") ? "down" : "up"}>
                  {stock.changeRate}
                </span>
              </div>
              <p className="muted">{stock.thesis}</p>
              <div className="tag-row">
                {stock.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="mini-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="ranking-meta">
              <strong>{stock.currentPriceLabel}</strong>
              <span className="muted">점수 {stock.score}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
