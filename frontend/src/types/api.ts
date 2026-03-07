export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  thesis: string;
}

export interface HeadlineNews {
  id: string;
  title: string;
  importance: string;
  published_at: string;
}

export interface DashboardData {
  date: string;
  market_status: string;
  last_analysis_at: string;
  briefing_summary: string;
  headline_news: HeadlineNews[];
  insights: {
    positive_industries: string[];
    risk_industries: string[];
    focus_symbols: WatchlistItem[];
  };
  market_indicators: Array<{
    label: string;
    value: string;
    change: string;
  }>;
  watchlist: WatchlistItem[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  published_at: string;
  importance: string;
  analysis_status: string;
  event_type: string;
  countries: string[];
  positive_industries: string[];
  negative_industries: string[];
  related_symbols: string[];
  ai_summary: string;
  counter_arguments: string[];
}

export interface StockDetail {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  last_analysis_at: string;
  thesis: string;
  bull_points: string[];
  risk_points: string[];
  checkpoints: string[];
  chart: Array<{
    date: string;
    close: number;
    volume: number;
  }>;
  related_news_ids: string[];
  industry_links: Array<{
    industry: string;
    relation: string;
    reason: string;
  }>;
}

export interface SyncNewsResponse {
  inserted_count: number;
  total_count: number;
}
