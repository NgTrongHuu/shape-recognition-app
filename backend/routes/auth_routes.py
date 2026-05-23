from fastapi import APIRouter, Depends

from backend.models.schemas import LoginRequest, ChangePasswordRequest, UpdateProfileRequest
from backend.services.auth_service import login_user, change_password, update_profile
from backend.auth.middleware import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post("/login")
def login(req: LoginRequest):
    return {"success": True, "data": login_user(req)}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"success": True, "data": {k: v for k, v in user.items() if k != "password_hash"}}


@router.post("/change-password")
def change_pw(req: ChangePasswordRequest, user=Depends(get_current_user)):
    return {"success": True, "data": change_password(req)}


@router.put("/profile")
def profile(req: UpdateProfileRequest, user=Depends(get_current_user)):
    return {"success": True, "data": update_profile(req)}
