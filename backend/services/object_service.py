"""Nhận diện vật thể realtime bằng YOLOv8 (model COCO 80 lớp).

Pipeline 2 chế độ:
  1. **Browser-side (ưu tiên)** — frontend tải model ONNX qua endpoint /objects/model,
     chạy bằng onnxruntime-web → 15–30 FPS, không tốn băng thông gửi ảnh lên server.
  2. **Server-side (fallback)** — vẫn giữ endpoint /objects/detect để fallback khi
     browser không hỗ trợ WebGL/WASM SIMD hoặc lần đầu chưa tải xong model.

Server-side đã được tối ưu: dùng YOLOv8s (chính xác hơn nano ~7 mAP), `model.fuse()`,
`imgsz=480` (nhanh hơn 640 ~40%). Phần này HOÀN TOÀN TÁCH BIỆT với engine nhận
diện hình học (shape_service + ml_classifier).
"""
import shutil
import threading
from pathlib import Path
from typing import List

import cv2
import numpy as np
from fastapi import HTTPException

from backend.config import (
    YOLO_MODEL_PATH, YOLO_MIN_CONFIDENCE, YOLO_IMG_SIZE,
    YOLO_VARIANT, YOLO_ONNX_PATH, ML_MODELS_DIR,
)
from backend.utils.image_codec import encode_jpeg_data_url
from backend.utils.logger import log_action, log_error

# 80 lớp COCO — tên tiếng Việt để hiển thị
COCO_VI = {
    "person": "Người", "bicycle": "Xe đạp", "car": "Ô tô", "motorcycle": "Xe máy",
    "airplane": "Máy bay", "bus": "Xe buýt", "train": "Tàu hỏa", "truck": "Xe tải",
    "boat": "Thuyền", "traffic light": "Đèn giao thông", "fire hydrant": "Trụ cứu hỏa",
    "stop sign": "Biển báo dừng", "parking meter": "Đồng hồ đỗ xe", "bench": "Ghế băng",
    "bird": "Chim", "cat": "Mèo", "dog": "Chó", "horse": "Ngựa", "sheep": "Cừu",
    "cow": "Bò", "elephant": "Voi", "bear": "Gấu", "zebra": "Ngựa vằn",
    "giraffe": "Hươu cao cổ", "backpack": "Ba lô", "umbrella": "Ô (dù)",
    "handbag": "Túi xách", "tie": "Cà vạt", "suitcase": "Vali", "frisbee": "Đĩa ném",
    "skis": "Ván trượt tuyết", "snowboard": "Ván trượt ván", "sports ball": "Bóng",
    "kite": "Diều", "baseball bat": "Gậy bóng chày", "baseball glove": "Găng bóng chày",
    "skateboard": "Ván trượt", "surfboard": "Ván lướt sóng", "tennis racket": "Vợt tennis",
    "bottle": "Chai", "wine glass": "Ly rượu", "cup": "Cốc", "fork": "Nĩa",
    "knife": "Dao", "spoon": "Thìa", "bowl": "Bát", "banana": "Chuối", "apple": "Táo",
    "sandwich": "Bánh sandwich", "orange": "Cam", "broccoli": "Bông cải xanh",
    "carrot": "Cà rốt", "hot dog": "Xúc xích", "pizza": "Pizza", "donut": "Bánh donut",
    "cake": "Bánh ngọt", "chair": "Ghế", "couch": "Ghế sofa", "potted plant": "Chậu cây",
    "bed": "Giường", "dining table": "Bàn ăn", "toilet": "Bồn cầu", "tv": "Tivi",
    "laptop": "Laptop", "mouse": "Chuột máy tính", "remote": "Điều khiển",
    "keyboard": "Bàn phím", "cell phone": "Điện thoại", "microwave": "Lò vi sóng",
    "oven": "Lò nướng", "toaster": "Máy nướng bánh", "sink": "Bồn rửa",
    "refrigerator": "Tủ lạnh", "book": "Sách", "clock": "Đồng hồ", "vase": "Bình hoa",
    "scissors": "Kéo", "teddy bear": "Gấu bông", "hair drier": "Máy sấy tóc",
    "toothbrush": "Bàn chải đánh răng",
}

# Thứ tự đúng 80 lớp COCO của YOLOv8 (cố định theo training data)
COCO_CLASSES_ORDER = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush",
]

_PALETTE = [
    (46, 171, 123), (232, 119, 34), (96, 165, 250),
    (245, 158, 11), (167, 139, 250), (244, 114, 182), (52, 211, 153),
]

_model = None
_lock = threading.Lock()


def _load():
    """Nạp model YOLO đúng một lần (lazy, thread-safe). Tự tải nếu chưa có."""
    global _model
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        try:
            from ultralytics import YOLO
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="Thiếu thư viện 'ultralytics'. Cài đặt: pip install ultralytics",
            )
        try:
            model_path = Path(YOLO_MODEL_PATH)
            model_path.parent.mkdir(parents=True, exist_ok=True)
            if model_path.exists():
                model = YOLO(str(model_path))
            else:
                # Lần đầu: ultralytics tự tải về (cần internet)
                model = YOLO(f"{YOLO_VARIANT}.pt")
                downloaded = Path(f"{YOLO_VARIANT}.pt")
                if downloaded.exists():
                    shutil.move(str(downloaded), str(model_path))
            # Fuse Conv+BN → nhanh hơn ~10-15% trên CPU
            try:
                model.fuse()
            except Exception:
                pass
        except Exception as e:
            log_error("YOLO load failed", str(e))
            raise HTTPException(
                status_code=500,
                detail=f"Không nạp được model nhận diện vật thể: {e}",
            )
        _model = model
        log_action("YOLO_LOADED", detail=f"{YOLO_VARIANT} @ imgsz={YOLO_IMG_SIZE}")
        return _model


def ensure_onnx_exported() -> Path:
    """Export model sang ONNX (idempotent). Trả về đường dẫn file ONNX.

    File này được serve cho frontend chạy YOLO trực tiếp trên browser bằng
    onnxruntime-web — đó là path "xịn nhất" cho realtime (15-30 FPS).
    """
    onnx_path = Path(YOLO_ONNX_PATH)
    if onnx_path.exists() and onnx_path.stat().st_size > 0:
        return onnx_path
    model = _load()
    onnx_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        # opset=12 tương thích rộng với onnxruntime-web
        exported = model.export(format="onnx", imgsz=YOLO_IMG_SIZE, opset=12, simplify=False)
        # ultralytics trả về str/Path của file đã xuất
        src = Path(str(exported))
        if src != onnx_path and src.exists():
            shutil.move(str(src), str(onnx_path))
        log_action("YOLO_ONNX_EXPORTED", detail=str(onnx_path))
    except Exception as e:
        log_error("YOLO ONNX export failed", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Không export được model sang ONNX: {e}",
        )
    return onnx_path


def detect_objects(image_bgr: np.ndarray, draw: bool = False) -> dict:
    """Nhận diện mọi vật thể trong ảnh (server-side fallback).

    Mặc định CHỈ trả tọa độ khung + nhãn để client tự vẽ overlay lên camera.
    """
    model = _load()
    results = model.predict(
        image_bgr,
        conf=YOLO_MIN_CONFIDENCE,
        imgsz=YOLO_IMG_SIZE,
        verbose=False,
    )

    output = image_bgr.copy() if draw else None
    objects: List[dict] = []

    for result in results:
        for i, box in enumerate(result.boxes):
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            label = model.names.get(cls_id, str(cls_id))
            label_vi = COCO_VI.get(label, label)
            x1, y1, x2, y2 = (int(v) for v in box.xyxy[0])

            if draw:
                color = _PALETTE[i % len(_PALETTE)]
                cv2.rectangle(output, (x1, y1), (x2, y2), color, 2)
                caption = f"{label_vi} {confidence * 100:.0f}%"
                (tw, th), _ = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(output, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)
                cv2.putText(output, caption, (x1 + 3, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

            objects.append({
                "stt": len(objects) + 1,
                "label": label,
                "ten": label_vi,
                "do_tin_cay": round(confidence, 4),
                "box": [x1, y1, x2, y2],
            })

    return {
        "image": encode_jpeg_data_url(output) if draw else None,
        "objects": objects,
        "tong_so": len(objects),
    }
