from fastapi import APIRouter, Depends

from backend.models.schemas import SettingsRequest
from backend.services.settings_service import get_settings, update_settings, reset_settings
from backend.auth.middleware import get_current_user

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@router.get("")
def read(user=Depends(get_current_user)):
    return {"success": True, "data": get_settings()}


@router.put("")
def update(req: SettingsRequest, user=Depends(get_current_user)):
    return {"success": True, "data": update_settings(req)}


@router.post("/reset")
def reset(user=Depends(get_current_user)):
    return {"success": True, "data": reset_settings()}
