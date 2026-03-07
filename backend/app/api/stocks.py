from fastapi import APIRouter, HTTPException

from app.schemas import StockDetail, WatchlistItem
from app.services.mock_data import analyze_stock_item, get_stock_detail, get_watchlist


router = APIRouter(tags=["stocks"])


@router.get("/watchlist", response_model=list[WatchlistItem])
def read_watchlist() -> list[WatchlistItem]:
    return get_watchlist()


@router.get("/stocks/{symbol}", response_model=StockDetail)
def read_stock_detail(symbol: str) -> StockDetail:
    item = get_stock_detail(symbol)
    if item is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return item


@router.post("/stocks/{symbol}/analyze", response_model=StockDetail)
def analyze_stock(symbol: str) -> StockDetail:
    item = analyze_stock_item(symbol)
    if item is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return item
