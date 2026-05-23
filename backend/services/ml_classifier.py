"""Bộ phân loại hình học bằng model CNN (deep learning).

Đây là phần THAY THẾ 100% cho thuật toán đếm đỉnh của OpenCV: việc quyết định
"đây là hình học gì" hoàn toàn do model đảm nhận. OpenCV chỉ còn lo định vị
và đo đạc, không tham gia vào quyết định phân loại.

Model được huấn luyện ở ml/2_train_model.py và đặt tại ml/models/.
"""
import json
import threading
from pathlib import Path

import cv2
import numpy as np
from fastapi import HTTPException

# ml/models/ nằm ở gốc project (ngoài thư mục backend/)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = _PROJECT_ROOT / "ml" / "models"
MODEL_PATH = MODEL_DIR / "shape_model.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"

IMG_SIZE = 128  # phải khớp với IMG_SIZE lúc train

_model = None
_class_names = None
_lock = threading.Lock()


def is_ready() -> bool:
    """True nếu đã có đủ file model + class names để dùng (không nạp model)."""
    return MODEL_PATH.exists() and CLASS_NAMES_PATH.exists()


def ensure_ready() -> None:
    """Báo lỗi rõ ràng nếu model chưa sẵn sàng (hướng a: không fallback OpenCV)."""
    if not is_ready():
        raise HTTPException(
            status_code=503,
            detail=(
                "Model nhận diện hình học chưa sẵn sàng. Hãy huấn luyện bằng "
                "ml/2_train_model.py, sau đó đặt 'shape_model.keras' và "
                "'class_names.json' vào thư mục ml/models/."
            ),
        )


def _load() -> None:
    """Nạp model + class names đúng một lần (lazy, thread-safe)."""
    global _model, _class_names
    if _model is not None:
        return
    with _lock:
        if _model is not None:
            return
        ensure_ready()
        try:
            import tensorflow as tf
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="Thiếu thư viện 'tensorflow'. Cài đặt: pip install tensorflow",
            )
        try:
            model = tf.keras.models.load_model(str(MODEL_PATH))
            with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
                class_names = json.load(f)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Không nạp được model nhận diện: {e}",
            )
        _model, _class_names = model, class_names


def _preprocess(region_bgr: np.ndarray) -> np.ndarray:
    """Đưa một vùng ảnh BGR về đúng định dạng model lúc train: 128x128 RGB, [0,1]."""
    rgb = cv2.cvtColor(region_bgr, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (IMG_SIZE, IMG_SIZE))
    return resized.astype(np.float32) / 255.0


def classify(region_bgr: np.ndarray) -> tuple:
    """Dự đoán loại hình của MỘT vùng ảnh.

    Trả về (loai_hinh, do_tin_cay). Nhãn hình 100% do model quyết định.
    """
    _load()
    batch = np.expand_dims(_preprocess(region_bgr), axis=0)
    probs = _model.predict(batch, verbose=0)[0]
    idx = int(np.argmax(probs))
    return _class_names[idx], float(probs[idx])
