from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import (
    HoldingCreateIn,
    HoldingOut,
    HoldingUpdateIn,
    PortfolioSummaryOut,
)
from app.services import portfolio_store


router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/holdings", response_model=list[HoldingOut])
def list_holdings() -> list[dict]:
    return portfolio_store.list_holdings()


@router.post("/holdings", response_model=HoldingOut)
def create_holding(payload: HoldingCreateIn) -> dict:
    try:
        return portfolio_store.create_holding(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/holdings/{hid}", response_model=HoldingOut)
def update_holding(hid: int, payload: HoldingUpdateIn) -> dict:
    try:
        return portfolio_store.update_holding(
            hid, payload.model_dump(exclude_none=True)
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/holdings/{hid}")
def delete_holding(hid: int) -> dict:
    try:
        portfolio_store.delete_holding(hid)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"ok": True}


@router.get("/summary", response_model=PortfolioSummaryOut)
def get_summary() -> dict:
    return portfolio_store.get_summary()
