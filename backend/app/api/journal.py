from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import (
    MonthlyStatsOut,
    PredictionCreateIn,
    PredictionOut,
    VerifyPredictionIn,
)
from app.services import journal_store


router = APIRouter(prefix="/journal", tags=["journal"])


@router.post("/predictions", response_model=PredictionOut)
def create_prediction(payload: PredictionCreateIn) -> dict:
    try:
        return journal_store.upsert_prediction(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/predictions", response_model=list[PredictionOut])
def list_predictions(limit: int = 30) -> list[dict]:
    return journal_store.list_predictions(limit=limit)


@router.get("/predictions/by-date/{date}", response_model=PredictionOut)
def get_by_date(date: str) -> dict:
    row = journal_store.get_prediction_by_date(date)
    if row is None:
        raise HTTPException(status_code=404, detail="prediction not found")
    return row


@router.get("/predictions/{pid}", response_model=PredictionOut)
def get_one(pid: int) -> dict:
    row = journal_store.get_prediction_by_id(pid)
    if row is None:
        raise HTTPException(status_code=404, detail="prediction not found")
    return row


@router.post("/predictions/{pid}/verify", response_model=PredictionOut)
def verify(pid: int, payload: VerifyPredictionIn) -> dict:
    try:
        return journal_store.verify_prediction(
            pid, payload.lesson, [o.model_dump() for o in payload.outcomes]
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/stats", response_model=MonthlyStatsOut)
def stats(month: str) -> dict:
    return journal_store.monthly_stats(month)
