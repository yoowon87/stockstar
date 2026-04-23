from __future__ import annotations
from typing import Dict, List, Optional
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


# ─────────── Journal (Phase 2) ───────────

class StockForecastIn(BaseModel):
    symbol: str
    label: str = ""
    current_price: Optional[float] = None
    predicted_direction: str  # 'up' | 'flat' | 'down'
    rationale: str = ""


class PredictionCreateIn(BaseModel):
    date: str  # YYYY-MM-DD
    market_temp: str  # 'cold' | 'warm' | 'hot'
    today_thoughts: str = ""
    news_observation: str = ""
    kospi_current: Optional[float] = None
    kospi_forecast_1w: Optional[float] = None
    kospi_rationale: str = ""
    kospi_counter_reason: str = ""
    emotion_state: str = ""
    impulse_note: str = ""
    stock_forecasts: List[StockForecastIn] = []


class StockForecastOut(BaseModel):
    id: int
    symbol: str
    label: str
    current_price: Optional[float] = None
    predicted_direction: str
    rationale: str
    actual_direction: Optional[str] = None
    actual_pct: Optional[float] = None
    is_correct: Optional[bool] = None


class PredictionOut(BaseModel):
    id: int
    date: str
    market_temp: str
    today_thoughts: str
    news_observation: str
    kospi_current: Optional[float] = None
    kospi_forecast_1w: Optional[float] = None
    kospi_rationale: str
    kospi_counter_reason: str
    emotion_state: str
    impulse_note: str
    verified_at: Optional[str] = None
    lesson: str
    created_at: str
    stock_forecasts: List[StockForecastOut] = []


class StockOutcomeIn(BaseModel):
    forecast_id: int
    actual_direction: str  # 'up' | 'flat' | 'down'
    actual_pct: Optional[float] = None


class VerifyPredictionIn(BaseModel):
    lesson: str = ""
    outcomes: List[StockOutcomeIn] = []


class DirectionStat(BaseModel):
    count: int
    correct: int
    pct: float


class MonthlyStatsOut(BaseModel):
    month: str
    total_predictions: int
    total_stock_forecasts: int
    correct: int
    wrong: int
    accuracy_pct: float
    by_direction: Dict[str, DirectionStat]


# ─────────── Portfolio (Phase 3) ───────────

class HoldingCreateIn(BaseModel):
    bucket: str  # 'core' | 'edge' | 'satellite'
    symbol: str
    label: str = ""
    shares: float
    avg_price: float
    note: str = ""


class HoldingUpdateIn(BaseModel):
    bucket: Optional[str] = None
    label: Optional[str] = None
    shares: Optional[float] = None
    avg_price: Optional[float] = None
    note: Optional[str] = None


class HoldingOut(BaseModel):
    id: int
    bucket: str
    symbol: str
    label: str
    shares: float
    avg_price: float
    note: str
    added_at: str
    updated_at: str


class HoldingSummary(BaseModel):
    id: int
    bucket: str
    symbol: str
    label: str
    shares: float
    avg_price: float
    current_price: Optional[float] = None
    cost: float
    value: float
    pnl: float
    pnl_pct: float
    share_of_total_pct: float
    share_of_bucket_pct: float
    note: str


class BucketSummary(BaseModel):
    code: str
    label: str
    target_pct: float
    actual_pct: float
    cost: float
    value: float
    pnl: float
    pnl_pct: float
    holdings: List[HoldingSummary] = []


class PortfolioWarning(BaseModel):
    level: str  # 'error' | 'warn' | 'info'
    code: str
    message: str


class PortfolioSummaryOut(BaseModel):
    as_of: str
    total_cost: float
    total_value: float
    total_pnl: float
    total_pnl_pct: float
    buckets: List[BucketSummary]
    warnings: List[PortfolioWarning]


# ─────────── Edge Research (Phase 4) ───────────

class EdgeResearchIn(BaseModel):
    symbol: str
    label: str = ""
    sector: str = ""
    checklist: Dict[str, bool] = {}
    checklist_notes: Dict[str, str] = {}
    q1_answer: str = ""
    q2_answer: str = ""
    q3_answer: str = ""
    decision: str = "pending"  # 'pending' | 'buy' | 'watch' | 'pass'
    decision_note: str = ""


class EdgeResearchOut(BaseModel):
    symbol: str
    label: str
    sector: str
    checklist: Dict[str, bool]
    checklist_notes: Dict[str, str]
    q1_answer: str
    q2_answer: str
    q3_answer: str
    decision: str
    decision_note: str
    created_at: str
    updated_at: str


# ─────────── Routine / Review (Phase 5) ───────────

class RoutineLogIn(BaseModel):
    morning_done: bool = False
    lunch_done: bool = False
    evening_done: bool = False
    note: str = ""


class RoutineLogOut(BaseModel):
    date: str
    morning_done: bool
    lunch_done: bool
    evening_done: bool
    note: str
    updated_at: str


class ReviewIn(BaseModel):
    scope: str          # 'weekly' | 'monthly' | 'quarterly'
    period_key: str     # 'YYYY-Www' | 'YYYY-MM' | 'YYYY-Qn'
    content: Dict[str, str] = {}


class ReviewOut(BaseModel):
    id: int
    scope: str
    period_key: str
    content: Dict[str, str]
    created_at: str
    updated_at: str
