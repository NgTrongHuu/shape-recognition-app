from fastapi import APIRouter, Depends

from backend.services.history_service import (
    list_records, get_record, delete_record, clear_all,
)
from backend.auth.middleware import get_current_user

router = APIRouter(prefix="/api/v1/history", tags=["History"])


@router.get("")
def get_all(user=Depends(get_current_user)):
    return {"success": True, "data": list_records()}


@router.delete("")
def clear(user=Depends(get_current_user)):
    return {"success": True, "data": clear_all()}


@router.get("/{record_id}")
def get_one(record_id: str, user=Depends(get_current_user)):
    return {"success": True, "data": get_record(record_id)}


@router.delete("/{record_id}")
def remove(record_id: str, user=Depends(get_current_user)):
    return {"success": True, "data": delete_record(record_id)}
