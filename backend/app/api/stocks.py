from __future__ import annotations
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas import StockDetail, WatchlistItem
from app.services.mock_data import analyze_stock_item, get_stock_detail, get_watchlist
from app.services.stock_data import fetch_stock_quotes, fetch_market_indicators


class QuotesRequest(BaseModel):
    symbols: List[str]


router = APIRouter(tags=["stocks"])


@router.get("/market-indicators")
def get_market_indicators():
    """Fetch major market indicators (Nasdaq, S&P, USD/KRW, WTI, 10Y)."""
    return fetch_market_indicators()


@router.post("/stocks/quotes")
def get_stock_quotes(body: QuotesRequest):
    """Fetch real-time quotes for given symbols."""
    if not body.symbols:
        raise HTTPException(status_code=400, detail="symbols list required")
    return fetch_stock_quotes(body.symbols)


@router.get("/watchlist", response_model=List[WatchlistItem])
def read_watchlist():
    # type: () -> List[WatchlistItem]
    return get_watchlist()


@router.get("/stocks/{symbol}", response_model=StockDetail)
def read_stock_detail(symbol):
    # type: (str) -> StockDetail
    item = get_stock_detail(symbol)
    if item is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return item


@router.post("/stocks/{symbol}/analyze", response_model=StockDetail)
def analyze_stock(symbol):
    # type: (str) -> StockDetail
    item = analyze_stock_item(symbol)
    if item is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return item
