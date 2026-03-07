from fastapi import APIRouter, HTTPException

from app.schemas import NewsItem, SyncNewsResponse
from app.services.mock_data import (
    analyze_news_item,
    get_news_detail,
    get_news_list,
    sync_live_news,
)


router = APIRouter(tags=["news"])


@router.get("/news", response_model=list[NewsItem])
def read_news() -> list[NewsItem]:
    return get_news_list()


@router.get("/news/{news_id}", response_model=NewsItem)
def read_news_detail(news_id: str) -> NewsItem:
    item = get_news_detail(news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return item


@router.post("/news/{news_id}/analyze", response_model=NewsItem)
def analyze_news(news_id: str) -> NewsItem:
    item = analyze_news_item(news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return item


@router.post("/news/sync", response_model=SyncNewsResponse)
def sync_news_feed() -> SyncNewsResponse:
    return sync_live_news()
