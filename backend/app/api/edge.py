from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import EdgeResearchIn, EdgeResearchOut
from app.services import edge_store


router = APIRouter(prefix="/edge", tags=["edge"])


@router.get("/research", response_model=list[EdgeResearchOut])
def list_research() -> list[dict]:
    return edge_store.list_research()


@router.get("/research/{symbol}", response_model=EdgeResearchOut)
def get_research(symbol: str) -> dict:
    row = edge_store.get_research(symbol)
    if row is None:
        raise HTTPException(status_code=404, detail="research not found")
    return row


@router.post("/research", response_model=EdgeResearchOut)
def upsert_research(payload: EdgeResearchIn) -> dict:
    try:
        return edge_store.upsert_research(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/research/{symbol}")
def delete_research(symbol: str) -> dict:
    try:
        edge_store.delete_research(symbol)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"ok": True}
