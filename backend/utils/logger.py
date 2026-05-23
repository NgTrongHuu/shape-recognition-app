import os
from loguru import logger

from backend.config import LOGS_DIR

os.makedirs(LOGS_DIR, exist_ok=True)

logger.add(
    os.path.join(LOGS_DIR, "app.log"),
    rotation="10 MB",
    retention="30 days",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="INFO",
)


def log_action(action: str, user: str = "system", detail: str = ""):
    logger.info(f"[{action}] user={user} | {detail}")


def log_error(error: str, detail: str = ""):
    logger.error(f"[ERROR] {error} | {detail}")
