from __future__ import annotations
from typing import List, Optional
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
    positive_industries: List[str]
    risk_industries: List[str]
    focus_symbols: List[WatchlistItem]


class MarketIndicator(BaseModel):
    label: str
    value: str
    change: str


class DashboardPayload(BaseModel):
    date: str
    market_status: str
    last_analysis_at: str
    briefing_summary: str
    headline_news: List[HeadlineNews]
    insights: DashboardInsights
    market_indicators: List[MarketIndicator]
    watchlist: List[WatchlistItem]


class Speaker(BaseModel):
    name: str
    type: str
    country: str


class AffectedCountry(BaseModel):
    country: str
    direction: str


class NewsItem(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    published_at: str
    importance: str
    analysis_status: str
    event_type: str
    origin_country: str = ""
    speaker: Speaker = Speaker(name="", type="unknown", country="")
    affected_countries: List[AffectedCountry] = []
    countries: List[str]
    positive_industries: List[str]
    negative_industries: List[str]
    related_symbols: List[str]
    ai_summary: str
    counter_arguments: List[str]
    link: str = ""
    body: str = ""


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
    bull_points: List[str]
    risk_points: List[str]
    checkpoints: List[str]
    chart: List[ChartPoint]
    related_news_ids: List[str]
    industry_links: List[IndustryLink]


class SyncNewsResponse(BaseModel):
    inserted_count: int
    total_count: int


class CollectNewsResponse(BaseModel):
    inserted_count: int
    total_fetched: int
    after_dedup: int
    total_in_db: int
    regions_queried: int
    errors: List[str] = []
