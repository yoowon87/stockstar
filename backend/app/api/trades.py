from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import TradeLogIn, TradeLogOut, TradeLogUpdateIn
from app.services import trade_store


router = APIRouter(prefix="/trades", tags=["trades"])


@router.get("", response_model=list[TradeLogOut])
def list_trades(limit: int = 100) -> list[dict]:
    return trade_store.list_trades(limit=limit)


@router.post("", response_model=TradeLogOut)
def create_trade(payload: TradeLogIn) -> dict:
    try:
        return trade_store.create_trade(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.put("/{tid}", response_model=TradeLogOut)
def update_trade(tid: int, payload: TradeLogUpdateIn) -> dict:
    try:
        return trade_store.update_trade(tid, payload.model_dump(exclude_unset=True))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{tid}")
def delete_trade(tid: int) -> dict:
    try:
        trade_store.delete_trade(tid)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"ok": True}
