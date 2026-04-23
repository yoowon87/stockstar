from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import ReviewIn, ReviewOut
from app.services import review_store


router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewOut])
def list_reviews(scope: str | None = None, limit: int = 30) -> list[dict]:
    return review_store.list_reviews(scope=scope, limit=limit)


@router.get("/by-key", response_model=ReviewOut)
def get_by_key(scope: str, period_key: str) -> dict:
    row = review_store.get_review(scope, period_key)
    if row is None:
        raise HTTPException(status_code=404, detail="review not found")
    return row


@router.post("", response_model=ReviewOut)
def upsert_review(payload: ReviewIn) -> dict:
    try:
        return review_store.upsert_review(payload.scope, payload.period_key, payload.content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{review_id}")
def delete_review(review_id: int) -> dict:
    try:
        review_store.delete_review(review_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"ok": True}
