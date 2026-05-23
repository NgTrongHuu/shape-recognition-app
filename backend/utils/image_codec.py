"""Tiện ích mã hóa / giải mã ảnh — dùng chung cho mọi engine nhận diện.

Gom 3 thao tác ảnh trước đây bị lặp nguyên văn ở shape_service và
object_service, tránh trùng lặp logic.
"""
import io
import base64

import cv2
import numpy as np
from PIL import Image
from fastapi import HTTPException


def decode_base64_image(data: str) -> np.ndarray:
    """Giải mã ảnh base64 (data URL hoặc chuỗi thuần) thành ảnh BGR."""
    try:
        if "," in data:
            data = data.split(",", 1)[1]
        raw = base64.b64decode(data)
        image = Image.open(io.BytesIO(raw)).convert("RGB")
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ảnh không hợp lệ: {e}")


def decode_image_bytes(file_bytes: bytes) -> np.ndarray:
    """Giải mã ảnh từ bytes của file tải lên thành ảnh BGR."""
    try:
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không đọc được file ảnh: {e}")


def encode_jpeg_data_url(image_bgr: np.ndarray) -> str:
    """Mã hóa ảnh BGR thành data URL JPEG."""
    ok, buffer = cv2.imencode(".jpg", image_bgr)
    if not ok:
        raise HTTPException(status_code=500, detail="Không mã hóa được ảnh kết quả")
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode()
