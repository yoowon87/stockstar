-- StockStar schema for Supabase (Postgres).
-- Run this in Supabase SQL Editor once, after creating the project.

CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source TEXT NOT NULL,
    published_at TEXT NOT NULL,
    importance TEXT NOT NULL,
    analysis_status TEXT NOT NULL,
    event_type TEXT NOT NULL,
    origin_country TEXT NOT NULL DEFAULT '',
    speaker TEXT NOT NULL DEFAULT '{}',
    affected_countries TEXT NOT NULL DEFAULT '[]',
    countries TEXT NOT NULL,
    positive_industries TEXT NOT NULL,
    negative_industries TEXT NOT NULL,
    related_symbols TEXT NOT NULL,
    ai_summary TEXT NOT NULL,
    counter_arguments TEXT NOT NULL,
    analyzed_at TEXT,
    link TEXT DEFAULT '',
    body TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS stock_details (
    symbol TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    change_pct DOUBLE PRECISION NOT NULL,
    last_analysis_at TEXT NOT NULL,
    thesis TEXT NOT NULL,
    bull_points TEXT NOT NULL,
    risk_points TEXT NOT NULL,
    checkpoints TEXT NOT NULL,
    chart TEXT NOT NULL,
    related_news_ids TEXT NOT NULL,
    industry_links TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dashboard_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    date TEXT NOT NULL,
    market_status TEXT NOT NULL,
    last_analysis_at TEXT NOT NULL,
    positive_industries TEXT NOT NULL,
    risk_industries TEXT NOT NULL,
    market_indicators TEXT NOT NULL,
    briefing_summary TEXT NOT NULL
);

-- ─────────── Journal (Phase 2) ───────────

CREATE TABLE IF NOT EXISTS predictions (
    id BIGSERIAL PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    market_temp TEXT NOT NULL,
    today_thoughts TEXT NOT NULL DEFAULT '',
    news_observation TEXT NOT NULL DEFAULT '',
    kospi_current DOUBLE PRECISION,
    kospi_forecast_1w DOUBLE PRECISION,
    kospi_rationale TEXT NOT NULL DEFAULT '',
    kospi_counter_reason TEXT NOT NULL DEFAULT '',
    emotion_state TEXT NOT NULL DEFAULT '',
    impulse_note TEXT NOT NULL DEFAULT '',
    verified_at TEXT,
    lesson TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prediction_stock_forecasts (
    id BIGSERIAL PRIMARY KEY,
    prediction_id BIGINT NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    current_price DOUBLE PRECISION,
    predicted_direction TEXT NOT NULL,
    rationale TEXT NOT NULL DEFAULT '',
    actual_direction TEXT,
    actual_pct DOUBLE PRECISION,
    is_correct INTEGER
);

CREATE INDEX IF NOT EXISTS idx_prediction_forecasts_prediction
    ON prediction_stock_forecasts(prediction_id);

-- ─────────── Portfolio (Phase 3) ───────────

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    bucket TEXT NOT NULL,
    symbol TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    shares DOUBLE PRECISION NOT NULL,
    avg_price DOUBLE PRECISION NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    added_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_bucket
    ON portfolio_holdings(bucket);

-- ─────────── Edge (Phase 4) ───────────

CREATE TABLE IF NOT EXISTS edge_research (
    symbol TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT '',
    sector TEXT NOT NULL DEFAULT '',
    checklist TEXT NOT NULL DEFAULT '{}',
    checklist_notes TEXT NOT NULL DEFAULT '{}',
    q1_answer TEXT NOT NULL DEFAULT '',
    q2_answer TEXT NOT NULL DEFAULT '',
    q3_answer TEXT NOT NULL DEFAULT '',
    decision TEXT NOT NULL DEFAULT 'pending',
    decision_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- ─────────── Routine / Review (Phase 5) ───────────

CREATE TABLE IF NOT EXISTS routine_logs (
    date TEXT PRIMARY KEY,
    morning_done INTEGER NOT NULL DEFAULT 0,
    lunch_done INTEGER NOT NULL DEFAULT 0,
    evening_done INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    scope TEXT NOT NULL,
    period_key TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(scope, period_key)
);

CREATE INDEX IF NOT EXISTS idx_reviews_scope_period
    ON reviews(scope, period_key);
