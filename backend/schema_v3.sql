-- Stockstar v3 — Theme Radar tables (additive on top of v2 schema).
-- Run this in Supabase SQL Editor once.

-- ========================================
-- 1. Theme master
-- ========================================
CREATE TABLE IF NOT EXISTS themes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  category      text NOT NULL,
  category_name text NOT NULL,
  description   text,
  keywords      text[] DEFAULT '{}',
  is_active     boolean DEFAULT true,
  display_order smallint DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_themes_active ON themes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_themes_category ON themes(category);

-- ========================================
-- 2. Theme-stock mapping
-- ========================================
CREATE TABLE IF NOT EXISTS theme_stocks (
  theme_id   uuid REFERENCES themes(id) ON DELETE CASCADE,
  stock_code text NOT NULL,
  stock_name text NOT NULL,
  is_leader  boolean DEFAULT false,
  weight     smallint DEFAULT 2,
  note       text,
  added_at   timestamptz DEFAULT now(),
  PRIMARY KEY (theme_id, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_theme_stocks_code ON theme_stocks(stock_code);

-- ========================================
-- 3. Stock snapshots (5-min poll)
-- ========================================
CREATE TABLE IF NOT EXISTS stock_snapshots (
  id           bigserial PRIMARY KEY,
  stock_code   text NOT NULL,
  snapshot_at  timestamptz NOT NULL,
  price        numeric(12,2),
  change_pct   numeric(6,2),
  volume       bigint,
  trade_amount bigint,
  market_cap   bigint
);

CREATE INDEX IF NOT EXISTS idx_snapshots_code_time ON stock_snapshots(stock_code, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON stock_snapshots(snapshot_at DESC);

-- ========================================
-- 4. Daily theme scores (calendar heatmap)
-- ========================================
CREATE TABLE IF NOT EXISTS daily_theme_scores (
  date          date NOT NULL,
  theme_id      uuid REFERENCES themes(id),
  total_amount  bigint,
  avg_change    numeric(6,2),
  rising_ratio  numeric(4,3),
  score         numeric(4,3),
  rank          smallint,
  is_confirmed  boolean,
  leader_code   text,
  leader_name   text,
  leader_change numeric(6,2),
  rising_stocks jsonb,
  PRIMARY KEY (date, theme_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_theme_scores(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_rank ON daily_theme_scores(date, rank);

-- ========================================
-- 5. Realtime theme score cache (5-min refresh)
-- ========================================
CREATE TABLE IF NOT EXISTS realtime_theme_scores (
  theme_id        uuid PRIMARY KEY REFERENCES themes(id),
  updated_at      timestamptz NOT NULL,
  total_amount    bigint,
  avg_change      numeric(6,2),
  rising_ratio    numeric(4,3),
  score           numeric(4,3),
  rank            smallint,
  is_confirmed    boolean,
  leader_code     text,
  leader_name     text,
  leader_change   numeric(6,2),
  news_count_24h  int DEFAULT 0,
  stocks_data     jsonb
);

-- ========================================
-- 6. Theme news (matched headlines)
-- ========================================
CREATE TABLE IF NOT EXISTS theme_news (
  id               bigserial PRIMARY KEY,
  theme_id         uuid REFERENCES themes(id) ON DELETE CASCADE,
  published_at     timestamptz NOT NULL,
  title            text NOT NULL,
  url              text,
  source           text,
  matched_keywords text[],
  classified_by    text DEFAULT 'haiku',
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_theme_time ON theme_news(theme_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_url ON theme_news(url);

-- ========================================
-- 7. Raw news headlines (pending classification)
-- ========================================
CREATE TABLE IF NOT EXISTS news_headlines (
  id            bigserial PRIMARY KEY,
  url           text UNIQUE,
  title         text NOT NULL,
  source        text,
  published_at  timestamptz NOT NULL,
  classified    boolean DEFAULT false,
  fetched_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_headlines_pending ON news_headlines(classified, published_at DESC);

-- ========================================
-- 8. Cached external API tokens (KIS, etc.)
-- ========================================
CREATE TABLE IF NOT EXISTS api_tokens (
  provider   text PRIMARY KEY,
  token      text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ========================================
-- 9. Admin change log
-- ========================================
CREATE TABLE IF NOT EXISTS theme_admin_logs (
  id         bigserial PRIMARY KEY,
  changed_at timestamptz DEFAULT now(),
  action     text,
  theme_code text,
  detail     jsonb
);
