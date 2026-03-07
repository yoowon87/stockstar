from pydantic import BaseModel


class HeadlineNews(BaseModel):
    id: str
    title: str
    importance: str
    published_at: str


class WatchlistItem(BaseModel):
    symbol: str
    name: str
    price: int
    change_pct: float
    thesis: str


class DashboardInsights(BaseModel):
    positive_industries: list[str]
    risk_industries: list[str]
    focus_symbols: list[WatchlistItem]


class MarketIndicator(BaseModel):
    label: str
    value: str
    change: str


class DashboardPayload(BaseModel):
    date: str
    market_status: str
    last_analysis_at: str
    briefing_summary: str
    headline_news: list[HeadlineNews]
    insights: DashboardInsights
    market_indicators: list[MarketIndicator]
    watchlist: list[WatchlistItem]


class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    published_at: str
    importance: str
    analysis_status: str
    event_type: str
    countries: list[str]
    positive_industries: list[str]
    negative_industries: list[str]
    related_symbols: list[str]
    ai_summary: str
    counter_arguments: list[str]


class ChartPoint(BaseModel):
    date: str
    close: int
    volume: int


class IndustryLink(BaseModel):
    industry: str
    relation: str
    reason: str


class StockDetail(BaseModel):
    symbol: str
    name: str
    price: int
    change_pct: float
    last_analysis_at: str
    thesis: str
    bull_points: list[str]
    risk_points: list[str]
    checkpoints: list[str]
    chart: list[ChartPoint]
    related_news_ids: list[str]
    industry_links: list[IndustryLink]


class SyncNewsResponse(BaseModel):
    inserted_count: int
    total_count: int
