from __future__ import annotations
import json
from functools import lru_cache
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data"


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=None)
def get_news_items() -> list[dict[str, Any]]:
    return _load_json(DATA_DIR / "news_items.json")


@lru_cache(maxsize=None)
def get_stock_details() -> dict[str, dict[str, Any]]:
    items = _load_json(DATA_DIR / "stock_details.json")
    return {item["symbol"]: item for item in items}


@lru_cache(maxsize=None)
def get_dashboard_config() -> dict[str, Any]:
    return _load_json(DATA_DIR / "dashboard.json")


@lru_cache(maxsize=None)
def get_watchlist() -> list[dict[str, Any]]:
    return _load_json(DATA_DIR / "watchlist.json")
