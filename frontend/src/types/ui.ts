import type { NewsItem } from "./api";

export interface PortfolioSlice {
  id: string;
  label: string;
  weight: number;
  amountLabel: string;
  color: string;
}

export interface PortfolioSummary {
  totalAsset: string;
  invested: string;
  cash: string;
  profitLoss: string;
  profitLossRate: string;
  slices: PortfolioSlice[];
}

export interface StockHolding {
  owned: boolean;
  averagePrice?: string;
  allocation?: string;
  profitLoss?: string;
}

export interface StockRecord {
  symbol: string;
  name: string;
  market: string;
  categoryIds: string[];
  currentPriceLabel: string;
  changeRate: string;
  score: number;
  thesis: string;
  description: string;
  categoryReason: string;
  marketCapLabel: string;
  volumeLabel: string;
  tags: string[];
  holding: StockHolding;
  chart: Array<{
    label: string;
    close: number;
    volume: number;
  }>;
}

export interface CategoryDefinition {
  id: string;
  label: string;
  accent: string;
  description: string;
  summary: string;
  representativeSymbols: string[];
  themes: string[];
}

export interface CategoryViewModel extends CategoryDefinition {
  stocks: StockRecord[];
  news: NewsItem[];
}
