import uuid
from datetime import datetime
from fastapi import HTTPException

from backend.config import ACCOUNT_FILE, DEFAULT_EMAIL, DEFAULT_PASSWORD, DEFAULT_NAME
from backend.utils.data_manager import load_json, save_json
from backend.utils.security import hash_password, verify_password, create_access_token
from backend.utils.logger import log_action, log_error
from backend.models.schemas import LoginRequest, ChangePasswordRequest, UpdateProfileRequest


def ensure_default_account() -> dict:
    """Tạo tài khoản mặc định khi chạy lần đầu (app chỉ 1 người dùng)."""
    account = load_json(ACCOUNT_FILE, {})
    if account and account.get("id"):
        return account
    account = {
        "id": f"user-{str(uuid.uuid4())[:8]}",
        "name": DEFAULT_NAME,
        "email": DEFAULT_EMAIL,
        "password_hash": hash_password(DEFAULT_PASSWORD),
        "created_at": datetime.now().isoformat(),
    }
    save_json(ACCOUNT_FILE, account)
    log_action("SEED_ACCOUNT", DEFAULT_EMAIL, "Tạo tài khoản mặc định")
    return account


def _safe(account: dict) -> dict:
    return {k: v for k, v in account.items() if k != "password_hash"}


def login_user(req: LoginRequest) -> dict:
    account = ensure_default_account()
    email_ok = req.email.strip().lower() == account["email"].lower()
    if not email_ok or not verify_password(req.password, account["password_hash"]):
        log_error("LOGIN_FAILED", f"email={req.email}")
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    token = create_access_token({"sub": account["id"]})
    log_action("LOGIN", account["email"])
    return {"access_token": token, "token_type": "bearer", "user": _safe(account)}


def change_password(req: ChangePasswordRequest) -> dict:
    account = ensure_default_account()
    if not verify_password(req.old_password, account["password_hash"]):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="Mật khẩu mới quá ngắn (tối thiểu 4 ký tự)")
    account["password_hash"] = hash_password(req.new_password)
    save_json(ACCOUNT_FILE, account)
    log_action("CHANGE_PASSWORD", account["email"])
    return {"message": "Đổi mật khẩu thành công"}


def update_profile(req: UpdateProfileRequest) -> dict:
    account = ensure_default_account()
    account["name"] = req.name.strip() or account["name"]
    save_json(ACCOUNT_FILE, account)
    log_action("UPDATE_PROFILE", account["email"])
    return _safe(account)
