import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { CategorySummaryCard } from "../components/dashboard/CategorySummaryCard";
import { CategoryTabs } from "../components/dashboard/CategoryTabs";
import { MarketOverviewBar } from "../components/dashboard/MarketOverviewBar";
import { NewsFeedPanel } from "../components/dashboard/NewsFeedPanel";
import { StockRankingList } from "../components/dashboard/StockRankingList";
import { StockDetailPanel } from "../components/stock/StockDetailPanel";
import { categoryDefinitions, stockUniverse } from "../data/mockInvestmentData";
import {
  generateDashboardBriefing,
  getDashboard,
  getNewsList,
  syncNewsFeed,
} from "../services/api";
import type { DashboardData, NewsItem } from "../types/api";
import type { CategoryViewModel } from "../types/ui";

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("etf");
  const [selectedSymbol, setSelectedSymbol] = useState("VOO");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboard(), getNewsList()])
      .then(([dashboardResponse, newsResponse]) => {
        setDashboard(dashboardResponse);
        setNewsItems(newsResponse);
      })
      .catch(console.error);
  }, []);

  const categoryViewModels = useMemo<CategoryViewModel[]>(() => {
    return categoryDefinitions.map((category) => ({
      ...category,
      stocks: stockUniverse.filter((stock) => stock.categoryIds.includes(category.id)),
      news: filterNewsForCategory(category.id, newsItems),
    }));
  }, [newsItems]);

  const selectedCategory =
    categoryViewModels.find((category) => category.id === selectedCategoryId) ??
    categoryViewModels[0];

  useEffect(() => {
    if (
      selectedCategory &&
      !selectedCategory.stocks.some((stock) => stock.symbol === selectedSymbol)
    ) {
      setSelectedSymbol(selectedCategory.stocks[0]?.symbol ?? stockUniverse[0].symbol);
    }
  }, [selectedCategory, selectedSymbol]);

  const selectedStock =
    stockUniverse.find((stock) => stock.symbol === selectedSymbol) ?? stockUniverse[0];

  const relatedNews = filterNewsForStock(selectedStock.symbol, newsItems);

  async function handleGenerateBriefing() {
    setIsGenerating(true);
    try {
      const updated = await generateDashboardBriefing();
      setDashboard(updated);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSyncNews() {
    setIsSyncing(true);
    try {
      const result = await syncNewsFeed();
      setSyncStatus(
        `실시간 뉴스 ${result.inserted_count}건을 추가했습니다. 현재 총 ${result.total_count}건입니다.`,
      );
      const [dashboardResponse, newsResponse] = await Promise.all([
        getDashboard(),
        getNewsList(),
      ]);
      setDashboard(dashboardResponse);
      setNewsItems(newsResponse);
    } finally {
      setIsSyncing(false);
    }
  }

  if (!dashboard || !selectedCategory) {
    return <div className="content-card">대시보드 데이터를 불러오는 중입니다...</div>;
  }

  return (
    <div className="dashboard-shell">
      <MarketOverviewBar dashboard={dashboard} />

      <section className="page-actions">
        <div className="hero-summary-card">
          <p className="eyebrow">Morning Briefing</p>
          <h3>{dashboard.briefing_summary}</h3>
          <p className="muted">
            오늘 핵심 뉴스 {dashboard.headline_news.length}건, 수혜 산업{" "}
            {dashboard.insights.positive_industries.join(", ")}
          </p>
        </div>
        <div className="action-row">
          <button
            className="primary-button"
            type="button"
            onClick={handleGenerateBriefing}
            disabled={isGenerating}
          >
            {isGenerating ? "브리핑 생성 중..." : "오늘 브리핑 생성"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={handleSyncNews}
            disabled={isSyncing}
          >
            {isSyncing ? "동기화 중..." : "실시간 뉴스 동기화"}
          </button>
        </div>
      </section>

      {syncStatus ? <section className="status-banner">{syncStatus}</section> : null}

      <CategoryTabs
        categories={categoryDefinitions}
        selectedCategoryId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />

      <div className="dashboard-content-grid">
        <section className="main-column">
          <CategorySummaryCard category={selectedCategory} />
          <div className="secondary-grid">
            <StockRankingList
              stocks={selectedCategory.stocks}
              selectedSymbol={selectedStock.symbol}
              onSelect={setSelectedSymbol}
            />
            <NewsFeedPanel categoryLabel={selectedCategory.label} news={selectedCategory.news} />
          </div>
          <section className="content-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Headlines</p>
                <h3>오늘 먼저 볼 뉴스</h3>
              </div>
            </div>
            <div className="stack">
              {dashboard.headline_news.map((item) => (
                <Link key={item.id} to={`/news/${item.id}`} className="headline-row">
                  <div className="list-item-body">
                    <strong>{item.title}</strong>
                    <span className="muted">
                      {item.importance} priority ·{" "}
                      {new Date(item.published_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-link">상세 보기</span>
                </Link>
              ))}
            </div>
          </section>
        </section>

        <StockDetailPanel stock={selectedStock} relatedNews={relatedNews} />
      </div>
    </div>
  );
}

function filterNewsForCategory(categoryId: string, newsItems: NewsItem[]) {
  return newsItems
    .filter((item) => {
      const text = `${item.title} ${item.summary}`.toLowerCase();

      if (categoryId === "etf") {
        return (
          text.includes("etf") ||
          text.includes("index") ||
          text.includes("nasdaq") ||
          text.includes("s&p") ||
          text.includes("금리")
        );
      }

      if (categoryId === "moat") {
        return (
          text.includes("apple") ||
          text.includes("microsoft") ||
          text.includes("visa") ||
          text.includes("consumer") ||
          text.includes("cloud")
        );
      }

      if (categoryId === "future") {
        return (
          text.includes("ai") ||
          text.includes("반도체") ||
          text.includes("semiconductor") ||
          text.includes("hbm") ||
          text.includes("memory") ||
          text.includes("energy")
        );
      }

      return (
        text.includes("risk") ||
        text.includes("cash") ||
        text.includes("oil") ||
        text.includes("유가")
      );
    })
    .slice(0, 4);
}

function filterNewsForStock(symbol: string, newsItems: NewsItem[]) {
  return newsItems.filter((item) => item.related_symbols.includes(symbol)).slice(0, 4);
}
