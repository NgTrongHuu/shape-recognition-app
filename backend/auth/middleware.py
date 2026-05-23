from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.utils.security import decode_token
from backend.utils.data_manager import load_json
from backend.config import ACCOUNT_FILE

security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Xác thực JWT và trả về tài khoản người dùng duy nhất của hệ thống."""
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    account = load_json(ACCOUNT_FILE, {})
    if not user_id or not account or account.get("id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại",
        )
    return account
