from __future__ import annotations
from typing import List, Dict, Optional
from fastapi import APIRouter

from app.schemas import DashboardPayload
from app.services.mock_data import generate_dashboard_briefing, get_dashboard_payload


router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardPayload)
def read_dashboard() -> DashboardPayload:
    return get_dashboard_payload()


@router.post("/dashboard/briefing", response_model=DashboardPayload)
def create_briefing() -> DashboardPayload:
    return generate_dashboard_briefing()
