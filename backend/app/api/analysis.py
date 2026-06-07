from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import StockAnalysisIn, StockAnalysisOut
from app.services import analysis_store


router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("", response_model=list[StockAnalysisOut])
def list_analyses() -> list[dict]:
    return analysis_store.list_analyses()


@router.get("/{symbol}", response_model=StockAnalysisOut)
def get_analysis(symbol: str) -> dict:
    row = analysis_store.get_analysis(symbol)
    if row is None:
        raise HTTPException(status_code=404, detail="analysis not found")
    return row


@router.post("", response_model=StockAnalysisOut)
def upsert_analysis(payload: StockAnalysisIn) -> dict:
    try:
        return analysis_store.upsert_analysis(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{symbol}")
def delete_analysis(symbol: str) -> dict:
    try:
        analysis_store.delete_analysis(symbol)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"ok": True}
