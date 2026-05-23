"""Nhận diện hình học từ webcam bằng HuggingFace Inference Router.

TÁCH HOÀN TOÀN khỏi shape_service.py (CNN cho upload).
Model: Qwen2.5-VL-72B-Instruct — vision-language model lớn, chịu nhiễu tốt.

Pipeline:
  1. Frontend chụp ảnh webcam → gửi base64 lên server
  2. Server gọi HF Router với prompt yêu cầu detect shape + JSON output
  3. Model trả về JSON {shapes: [{type, box, confidence}]}
  4. Server vẽ hộp + trả về cho frontend
"""
import base64
import json
import re
from typing import List

import cv2
import numpy as np
from fastapi import HTTPException

from backend.config import HF_API_KEY, HF_VISION_MODEL
from backend.services.shape_service import SHAPE_NAMES
from backend.utils.image_codec import encode_jpeg_data_url
from backend.utils.logger import log_action, log_error

# Map từ tên tiếng Anh model trả về → key tiếng Việt nội bộ
_TYPE_MAP = {
    "triangle": "tam_giac",
    "square": "vuong",
    "rectangle": "chu_nhat",
    "pentagon": "ngu_giac",
    "hexagon": "luc_giac",
    "circle": "tron",
    # Variant tiếng Anh khác model có thể trả
    "rhombus": "vuong",  # hình thoi → coi là vuông
    "diamond": "vuong",
    "oval": "tron",
    "ellipse": "tron",
}

_PROMPT = """Detect all geometric shapes drawn in this image (triangles, squares, rectangles, pentagons, hexagons, circles).

Rules:
- IGNORE the paper background, paper edges, shadows, hands, fingers, and other non-geometric objects.
- Do NOT report the paper itself as a rectangle.
- Each shape should be reported only ONCE.
- Coordinates [x1, y1, x2, y2] are in PIXEL units relative to the ORIGINAL image.
- Confidence is between 0 and 1.

Reply ONLY in valid JSON format, NO markdown, NO code blocks, NO explanation:
{"shapes": [{"type": "triangle|square|rectangle|pentagon|hexagon|circle", "box": [x1, y1, x2, y2], "confidence": 0.95}]}

If no shapes are detected, reply: {"shapes": []}"""


def _encode_image(image_bgr: np.ndarray) -> str:
    """Chuyển ảnh BGR sang base64 JPEG."""
    success, buffer = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not success:
        raise HTTPException(status_code=500, detail="Không mã hóa được ảnh JPEG")
    return base64.b64encode(buffer.tobytes()).decode("utf-8")


def _parse_response(text: str) -> List[dict]:
    """Trích JSON từ phản hồi model. Model đôi khi wrap trong markdown dù bảo không."""
    text = text.strip()
    # Bóc bỏ ```json ... ``` nếu có
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    # Tìm JSON object đầu tiên trong text (đề phòng model thêm chữ thừa)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        log_error("HF_PARSE_FAIL", f"{e}: {text[:200]}")
        return []
    shapes = data.get("shapes", [])
    if not isinstance(shapes, list):
        return []
    return shapes


def _call_hf(image_bgr: np.ndarray) -> List[dict]:
    """Gọi HF Router với ảnh, trả về danh sách shape thô."""
    if not HF_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="HF_API_KEY chưa được cấu hình trong .env",
        )
    try:
        import requests
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Thiếu thư viện 'requests'. Cài: pip install requests",
        )

    img_b64 = _encode_image(image_bgr)
    url = "https://router.huggingface.co/v1/chat/completions"
    body = {
        "model": HF_VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": _PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
            ],
        }],
        "max_tokens": 1000,
        "temperature": 0.1,  # deterministic
    }
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(url, json=body, headers=headers, timeout=60)
    except requests.RequestException as e:
        log_error("HF_NETWORK", str(e))
        raise HTTPException(status_code=502, detail=f"Không gọi được HuggingFace: {e}")

    if resp.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="HuggingFace quota tạm hết. Thử lại sau 1 phút.",
        )
    if resp.status_code != 200:
        log_error("HF_HTTP", f"{resp.status_code}: {resp.text[:300]}")
        raise HTTPException(
            status_code=502,
            detail=f"HuggingFace lỗi {resp.status_code}: {resp.text[:200]}",
        )

    try:
        result = resp.json()
        choices = result.get("choices", [])
        if not choices:
            return []
        content = choices[0].get("message", {}).get("content", "")
    except (KeyError, IndexError) as e:
        log_error("HF_RESPONSE_FORMAT", str(e))
        return []

    return _parse_response(content)


def detect_shapes_hf(image_bgr: np.ndarray, draw: bool = True) -> dict:
    """Nhận diện hình từ ảnh webcam bằng HF Router (Qwen2.5-VL-72B).

    draw=True: trả kèm ảnh đã chú thích.
    """
    raw_shapes = _call_hf(image_bgr)
    log_action("HF_DETECT", detail=f"raw={len(raw_shapes)} shapes")

    img_h, img_w = image_bgr.shape[:2]
    output = image_bgr.copy() if draw else None
    palette = [(46, 171, 123), (232, 119, 34), (96, 165, 250), (245, 158, 11), (167, 139, 250)]

    shapes: List[dict] = []
    for raw in raw_shapes:
        # Lấy "type" tiếng Anh từ model
        type_en = str(raw.get("type", "")).lower().strip()
        kind = _TYPE_MAP.get(type_en)
        if not kind:
            continue
        box = raw.get("box", [])
        if not isinstance(box, list) or len(box) != 4:
            continue
        try:
            x1, y1, x2, y2 = (int(v) for v in box)
        except (TypeError, ValueError):
            continue
        # Đảm bảo x1<x2, y1<y2 (model đôi khi đảo)
        if x1 > x2:
            x1, x2 = x2, x1
        if y1 > y2:
            y1, y2 = y2, y1
        # Clamp về biên ảnh (model đôi khi vượt biên)
        x1 = max(0, min(x1, img_w - 1))
        y1 = max(0, min(y1, img_h - 1))
        x2 = max(0, min(x2, img_w))
        y2 = max(0, min(y2, img_h))
        if x2 - x1 < 5 or y2 - y1 < 5:
            continue

        confidence = float(raw.get("confidence", 0.9))
        w, h = x2 - x1, y2 - y1
        idx = len(shapes)

        # Tổng hợp thông số hình học từ bbox
        props = {
            "dien_tich": round(w * h, 1),
            "chu_vi": round(2 * (w + h), 1),
            "chieu_rong": w,
            "chieu_cao": h,
            "so_dinh": _vertex_count(kind),
            "do_tron": 1.0 if kind == "tron" else 0.0,
            "toa_do_tam": {"x": x1 + w // 2, "y": y1 + h // 2},
        }
        detail = _detail_from_bbox(kind, w, h)

        shapes.append({
            "stt": idx + 1,
            "loai": kind,
            "ten_hinh": SHAPE_NAMES.get(kind, kind),
            "do_tin_cay": round(confidence, 4),
            "so_dinh": props["so_dinh"],
            "box": [x1, y1, x2, y2],
            "thong_so": props,
            "chi_tiet": detail,
        })

        if draw:
            color = palette[idx % len(palette)]
            cv2.rectangle(output, (x1, y1), (x2, y2), color, 3)
            # Chỉ vẽ số STT (ASCII) — tên tiếng Việt do client render bằng canvas
            label = f"{idx + 1}"
            cv2.putText(output, label, (x1 + 5, y1 + 22), cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(output, label, (x1 + 5, y1 + 22), cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, color, 1, cv2.LINE_AA)

    return {
        "image": encode_jpeg_data_url(output) if draw else None,
        "shapes": shapes,
        "tong_so_hinh": len(shapes),
    }


def _vertex_count(kind: str) -> int:
    return {
        "tam_giac": 3, "vuong": 4, "chu_nhat": 4,
        "ngu_giac": 5, "luc_giac": 6, "tron": 0,
    }.get(kind, 0)


def _detail_from_bbox(kind: str, w: int, h: int) -> dict:
    """Sinh chi tiết hình học từ bbox (model VL chỉ trả bbox, không trả contour)."""
    import math
    detail: dict = {}
    if kind == "tron":
        radius = min(w, h) / 2
        detail["ban_kinh"] = round(radius, 1)
        detail["duong_kinh"] = round(radius * 2, 1)
    elif kind in ("vuong", "chu_nhat"):
        detail["chieu_dai"] = max(w, h)
        detail["chieu_rong"] = min(w, h)
        detail["duong_cheo"] = round(math.hypot(w, h), 1)
    elif kind == "tam_giac":
        # Ước lệ tam giác đều từ bbox
        side = round(math.hypot(w, h) / 1.5, 1)
        detail["canh"] = [side, side, side]
        detail["goc"] = [60.0, 60.0, 60.0]
        detail["tong_goc"] = 180.0
        detail["phan_loai"] = "Tam giác (ước lệ từ bbox)"
    return detail
