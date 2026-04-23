from __future__ import annotations

from fastapi import APIRouter

from app.schemas import RoutineLogIn, RoutineLogOut
from app.services import routine_store


router = APIRouter(prefix="/routine", tags=["routine"])


@router.get("/{date}", response_model=RoutineLogOut)
def get_routine(date: str) -> dict:
    log = routine_store.get_log(date)
    if log is None:
        return routine_store.default_log(date)
    return log


@router.post("/{date}", response_model=RoutineLogOut)
def upsert_routine(date: str, payload: RoutineLogIn) -> dict:
    return routine_store.upsert_log(date, payload.model_dump())
