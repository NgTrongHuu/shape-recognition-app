"""Lưu trữ & truy vấn lịch sử nhận diện."""
import os
import uuid
import base64
from datetime import datetime
from collections import Counter

from fastapi import HTTPException

from backend.config import HISTORY_FILE, IMAGES_DIR
from backend.utils.data_manager import load_json, save_json
from backend.utils.logger import log_action


def _save_image(data_url: str, record_id: str) -> str:
    """Ghi ảnh kết quả (data URL) ra file, trả về URL tĩnh dùng cho frontend."""
    os.makedirs(IMAGES_DIR, exist_ok=True)
    raw = data_url.split(",", 1)[1] if "," in data_url else data_url
    path = os.path.join(IMAGES_DIR, f"{record_id}.jpg")
    with open(path, "wb") as f:
        f.write(base64.b64decode(raw))
    return f"/data/images/{record_id}.jpg"


def _load_history() -> list:
    """Đọc lịch sử, luôn ép về list để chống file JSON sai kiểu (vd: {})."""
    history = load_json(HISTORY_FILE, [])
    return history if isinstance(history, list) else []


def add_record(result: dict, source: str) -> dict:
    """Tạo bản ghi lịch sử từ kết quả nhận diện."""
    history = _load_history()
    record_id = str(uuid.uuid4())[:12]
    image_url = _save_image(result["image"], record_id)
    summary = Counter(s["ten_hinh"] for s in result["shapes"])

    record = {
        "id": record_id,
        "timestamp": datetime.now().isoformat(),
        "source": source,
        "image_url": image_url,
        "tong_so_hinh": result["tong_so_hinh"],
        "shapes": result["shapes"],
        "tom_tat": dict(summary),
    }
    history.insert(0, record)
    save_json(HISTORY_FILE, history)
    log_action("DETECT", detail=f"source={source} shapes={result['tong_so_hinh']}")
    return record


def list_records() -> list:
    return _load_history()


def get_record(record_id: str) -> dict:
    record = next((r for r in _load_history() if r.get("id") == record_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    return record


def delete_record(record_id: str) -> dict:
    history = _load_history()
    new_history = [r for r in history if r.get("id") != record_id]
    if len(new_history) == len(history):
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi")
    save_json(HISTORY_FILE, new_history)
    img = os.path.join(IMAGES_DIR, f"{record_id}.jpg")
    if os.path.exists(img):
        try:
            os.remove(img)
        except OSError:
            pass
    log_action("DELETE_HISTORY", detail=record_id)
    return {"message": "Đã xóa bản ghi"}


def clear_all() -> dict:
    save_json(HISTORY_FILE, [])
    try:
        for f in os.listdir(IMAGES_DIR):
            os.remove(os.path.join(IMAGES_DIR, f))
    except OSError:
        pass
    log_action("CLEAR_HISTORY")
    return {"message": "Đã xóa toàn bộ lịch sử"}
