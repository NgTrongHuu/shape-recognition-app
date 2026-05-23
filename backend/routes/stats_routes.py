from fastapi import APIRouter, Depends

from backend.services.stats_service import get_stats
from backend.auth.middleware import get_current_user

router = APIRouter(prefix="/api/v1/stats", tags=["Stats"])


@router.get("")
def stats(user=Depends(get_current_user)):
    return {"success": True, "data": get_stats()}
