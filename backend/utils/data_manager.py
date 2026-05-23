import json
import os
import shutil
import threading
from datetime import datetime
from typing import Any

from backend.config import BACKUPS_DIR
from backend.utils.logger import log_error

_lock = threading.Lock()


def _ensure_file(path: str, default: Any = None):
    if default is None:
        default = []
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default, f, ensure_ascii=False, indent=2)


def load_json(file_path: str, default: Any = None) -> Any:
    if default is None:
        default = []
    _ensure_file(file_path, default)
    try:
        with _lock:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        log_error("load_json failed", str(e))
        return default


def save_json(file_path: str, data: Any):
    _ensure_file(file_path, data if isinstance(data, list) else {})
    _backup(file_path)
    try:
        with _lock:
            tmp_path = file_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            os.replace(tmp_path, file_path)
    except Exception as e:
        log_error("save_json failed", str(e))
        raise


def _backup(file_path: str):
    if not os.path.exists(file_path):
        return
    try:
        os.makedirs(BACKUPS_DIR, exist_ok=True)
        name = os.path.basename(file_path)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        dest = os.path.join(BACKUPS_DIR, f"{name}.{ts}.bak")
        shutil.copy2(file_path, dest)
        _cleanup_backups(name)
    except Exception:
        pass


def _cleanup_backups(name: str, keep: int = 5):
    try:
        files = sorted(
            [f for f in os.listdir(BACKUPS_DIR) if f.startswith(name)],
            reverse=True,
        )
        for old in files[keep:]:
            os.remove(os.path.join(BACKUPS_DIR, old))
    except Exception:
        pass
