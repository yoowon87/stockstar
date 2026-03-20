from __future__ import annotations
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from app.schemas import NewsItem, SyncNewsResponse, CollectNewsResponse
from app.services.mock_data import (
    analyze_news_item,
    get_news_detail,
    get_news_list,
    sync_live_news,
)
from app.services.ai_analysis import analyze_news as ai_analyze_news


router = APIRouter(tags=["news"])


@router.get("/news/regions")
def get_regions():
    # type: () -> List[Dict[str, str]]
    """Return available regions for collection."""
    from app.services.global_collector import get_available_regions
    return get_available_regions()


@router.post("/news/collect/{region_code}")
def collect_region_news(region_code):
    # type: (str) -> Dict[str, Any]
    """Collect news from a single region. Called per-region for progress tracking."""
    from app.services.global_collector import collect_single_region, insert_collected_news

    result = collect_single_region(region_code)
    items = result.get("items", [])

    inserted = 0
    total = 0
    if items:
        inserted, total = insert_collected_news(items)

    return {
        "region": region_code,
        "fetched": len(items),
        "inserted": inserted,
        "total_in_db": total,
        "error": result.get("error"),
    }


@router.post("/news/collect")
def collect_global_news():
    # type: () -> Dict[str, Any]
    """Collect news from all regions at once (legacy/batch)."""
    from app.services.global_collector import collect_selected_regions, insert_collected_news
    from app.services.news_sources import REGION_QUERIES

    codes = [r["region_code"] for r in REGION_QUERIES]
    result = collect_selected_regions(codes)
    inserted, total = insert_collected_news(result["items"])

    return {
        "inserted_count": inserted,
        "total_fetched": result["stats"]["total_fetched"],
        "after_dedup": result["stats"]["after_dedup"],
        "total_in_db": total,
        "regions_queried": result["stats"]["regions_queried"],
        "errors": result["stats"]["errors"],
    }


@router.post("/news/sync", response_model=SyncNewsResponse)
def sync_news_feed():
    # type: () -> SyncNewsResponse
    return sync_live_news()


@router.get("/news", response_model=List[NewsItem])
def read_news():
    # type: () -> List[NewsItem]
    return get_news_list()


@router.get("/news/{news_id}", response_model=NewsItem)
def read_news_detail(news_id):
    # type: (str) -> NewsItem
    item = get_news_detail(news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return item


@router.post("/news/{news_id}/analyze")
def analyze_news(news_id):
    # type: (str) -> Dict[str, Any]
    """Analyze news with OpenAI. Falls back to mock if API fails."""
    item = get_news_detail(news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")

    news_dict = item.dict() if hasattr(item, "dict") else item

    try:
        ai_result = ai_analyze_news(news_dict)
        merged = dict(news_dict)
        merged.update(ai_result)
        return merged
    except Exception as e:
        fallback = analyze_news_item(news_id)
        if fallback is None:
            raise HTTPException(status_code=500, detail="Analysis failed: {}".format(str(e)))
        return fallback
