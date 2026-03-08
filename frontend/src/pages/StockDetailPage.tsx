import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { StockDetailPanel } from "../components/stock/StockDetailPanel";
import { stockUniverse } from "../data/mockInvestmentData";
import { getNewsList } from "../services/api";
import type { NewsItem } from "../types/api";

export function StockDetailPage() {
  const { symbol = "000660.KS" } = useParams();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    getNewsList().then(setNewsItems).catch(console.error);
  }, []);

  const stock = useMemo(
    () => stockUniverse.find((item) => item.symbol === symbol) ?? stockUniverse[0],
    [symbol],
  );

  const relatedNews = useMemo(
    () => newsItems.filter((item) => item.related_symbols.includes(stock.symbol)).slice(0, 5),
    [newsItems, stock.symbol],
  );

  return (
    <div className="detail-page-shell">
      <section className="content-card">
        <p className="eyebrow">Stock Detail</p>
        <h2>{stock.name}</h2>
        <p className="muted">
          차트, 보유 정보, 관련 뉴스, 카테고리 편입 이유를 한 번에 보는 종목 상세
          화면입니다.
        </p>
      </section>
      <StockDetailPanel stock={stock} relatedNews={relatedNews} compact />
    </div>
  );
}
