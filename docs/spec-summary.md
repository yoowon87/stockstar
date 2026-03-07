# Spec Summary

Core product direction extracted from `stock_news_analysis_mvp_spec.md`.

## Product

- Personal stock research dashboard, not an auto-trading system
- Convert macro/news events into explainable stock theses
- Prefer report-style outputs over chat-style AI responses

## MVP

- `Dashboard`
- `News`
- `Stock Detail`

## Operating model

- Base data is always visible
- AI analysis runs only on demand or on schedule
- Start with narrow sector coverage, especially semiconductors

## Architecture direction

- Frontend: React
- Backend: FastAPI
- Data source config and sector-stock mapping start from JSON
