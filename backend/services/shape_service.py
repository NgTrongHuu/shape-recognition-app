"""Engine nhận diện & phân tích hình học bằng OpenCV (thị giác máy tính).

Chỉ lo ĐỊNH VỊ và ĐO ĐẠC hình. Việc quyết định "đây là hình gì" hoàn toàn do
model CNN (ml_classifier) đảm nhận. Phần máy tính hình học (nhập tay) đã tách
sang geometry_calculator.py.
"""
import math
from typing import List

import cv2
import numpy as np

from backend.services import ml_classifier
from backend.utils.image_codec import encode_jpeg_data_url


# ---------------------------------------------------------------------------
# Hình học
# ---------------------------------------------------------------------------

def _dist(p1, p2) -> float:
    return float(math.hypot(p1[0] - p2[0], p1[1] - p2[1]))


def _angle(prev, cur, nxt) -> float:
    v1 = (prev[0] - cur[0], prev[1] - cur[1])
    v2 = (nxt[0] - cur[0], nxt[1] - cur[1])
    n1 = math.hypot(*v1)
    n2 = math.hypot(*v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    cosv = (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)
    cosv = max(-1.0, min(1.0, cosv))
    return round(math.degrees(math.acos(cosv)), 1)


SHAPE_NAMES = {
    "tam_giac": "Tam giác",
    "vuong": "Hình vuông",
    "chu_nhat": "Hình chữ nhật",
    "ngu_giac": "Ngũ giác",
    "luc_giac": "Lục giác",
    "tron": "Hình tròn",
    "da_giac": "Đa giác",
    "unknown": "Chưa xác định",
}


def _shape_detail(kind: str, approx: np.ndarray, contour: np.ndarray) -> dict:
    pts = [tuple(p[0]) for p in approx]
    detail: dict = {}

    if kind in ("tam_giac", "vuong", "chu_nhat", "ngu_giac", "luc_giac", "da_giac") and len(pts) >= 3:
        n = len(pts)
        sides = [round(_dist(pts[i], pts[(i + 1) % n]), 1) for i in range(n)]
        angles = [_angle(pts[(i - 1) % n], pts[i], pts[(i + 1) % n]) for i in range(n)]
        detail["canh"] = sides
        detail["goc"] = angles
        detail["tong_goc"] = round(sum(angles), 1)

    if kind == "tam_giac" and len(pts) == 3:
        s = sorted(detail["canh"])
        a, b, c = s
        if abs(a - b) < 0.08 * c and abs(b - c) < 0.08 * c:
            detail["phan_loai"] = "Tam giác đều"
        elif any(abs(g - 90) < 6 for g in detail["goc"]):
            detail["phan_loai"] = "Tam giác vuông"
        elif abs(a - b) < 0.08 * c or abs(b - c) < 0.08 * c:
            detail["phan_loai"] = "Tam giác cân"
        else:
            detail["phan_loai"] = "Tam giác thường"

    if kind in ("vuong", "chu_nhat"):
        x, y, w, h = cv2.boundingRect(approx)
        detail["chieu_dai"] = max(w, h)
        detail["chieu_rong"] = min(w, h)
        detail["duong_cheo"] = round(math.hypot(w, h), 1)

    if kind == "tron":
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        detail["ban_kinh"] = round(radius, 1)
        detail["duong_kinh"] = round(radius * 2, 1)

    return detail


def _properties(contour: np.ndarray, approx: np.ndarray) -> dict:
    area = cv2.contourArea(contour)
    perimeter = cv2.arcLength(contour, True)
    x, y, w, h = cv2.boundingRect(contour)
    M = cv2.moments(contour)
    if M["m00"] > 0:
        cx, cy = int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])
    else:
        cx, cy = x + w // 2, y + h // 2
    circularity = (4 * math.pi * area / (perimeter * perimeter)) if perimeter > 0 else 0
    return {
        "dien_tich": round(area, 1),
        "chu_vi": round(perimeter, 1),
        "chieu_rong": w,
        "chieu_cao": h,
        "so_dinh": len(approx),
        "do_tron": round(circularity, 3),
        "toa_do_tam": {"x": cx, "y": cy},
    }


# ---------------------------------------------------------------------------
# Pipeline nhận diện
# ---------------------------------------------------------------------------

# Khung trang giấy / nền chiếm > 60% ảnh → coi là "khung chứa", bỏ qua để bắt
# hình thật ở bên trong. Tránh trường hợp tờ A4 bị model nhận thành chữ nhật.
_FRAME_AREA_RATIO_MAX = 0.60
# Hình quá nhỏ ở rìa ảnh thường là nhiễu cạnh camera
_BORDER_MARGIN = 2

# === Bộ lọc nhiễu ===
# Tỉ lệ contour_area / bbox_area tối thiểu. Contour có bbox to nhưng "rỗng"
# (vd bbox bao quanh khoảng trắng giữa 2 nét bút) sẽ rớt dưới ngưỡng này.
# Hình tròn ~ 0.78, tam giác ~ 0.50, hình vuông ~ 0.95. Đặt 0.20 để vẫn giữ
# được tam giác lệch nhưng loại bbox-rỗng (thường < 0.10).
_MIN_FILL_RATIO = 0.20
# Hai bbox được coi là "trùng" nếu IoU > ngưỡng này → chỉ giữ 1
_NMS_IOU_THRESHOLD = 0.30


def _bbox_iou(a: tuple, b: tuple) -> float:
    """Tính IoU (Intersection over Union) của 2 bbox (x, y, w, h)."""
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ix1 = max(ax, bx)
    iy1 = max(ay, by)
    ix2 = min(ax + aw, bx + bw)
    iy2 = min(ay + ah, by + bh)
    iw = max(0, ix2 - ix1)
    ih = max(0, iy2 - iy1)
    inter = iw * ih
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def _preprocess_region(region_bgr: np.ndarray) -> np.ndarray:
  """Tiền xử lý region crop để khớp hơn với dữ liệu training (ảnh đơn giản trên nền đen).

  Training data: ảnh vẽ tay với nền đen, ánh sáng đều, không nhiễu.
  Webcam thực: nền xám, ánh sáng không đều, biên mềm.

  Cách khắc phục:
    1. Làm đen nền → loại bỏ độ phụ thuộc vào màu nền
    2. Tăng contrast → làm sắc nét ranh giới hình
    3. CLAHE → xử lý ánh sáng không đều
  """
  if region_bgr.size == 0:
    return region_bgr
  gray = cv2.cvtColor(region_bgr, cv2.COLOR_BGR2GRAY)

  # CLAHE (Contrast Limited Adaptive Histogram Equalization) — cải thiện ánh sáng không đều
  clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
  gray = clahe.apply(gray)

  # Thresholding đơn giản: binary (đen/trắng) → giống training data
  # Dùng adaptive threshold để xử lý ánh sáng biến đổi
  _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

  # Làm sắc nét cạnh bằng morphology
  kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
  binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)
  binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

  # Chuyển lại BGR (3 channel) để khớp với model input
  result = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
  return result


def _is_likely_frame(x: int, y: int, w: int, h: int, area: float, img_w: int, img_h: int) -> bool:
    """Đoán contour có phải khung giấy/nền cần bỏ qua không.

    Hai dấu hiệu rõ ràng:
      1. Diện tích chiếm phần lớn ảnh (vd tờ A4).
      2. Bbox dán sát mép ảnh — đặc trưng khung viền.
    """
    img_area = float(img_w * img_h)
    if img_area <= 0:
        return False
    if area / img_area >= _FRAME_AREA_RATIO_MAX:
        return True
    touches_border = (
        x <= _BORDER_MARGIN
        and y <= _BORDER_MARGIN
        and (x + w) >= img_w - _BORDER_MARGIN
        and (y + h) >= img_h - _BORDER_MARGIN
    )
    return touches_border


def _build_binary(image_bgr: np.ndarray, blur_k: int) -> np.ndarray:
    """Tạo ảnh nhị phân bền với nền giấy A4 + ánh sáng không đều.

    Kết hợp:
      - Canny (bắt cạnh sắc nét)
      - Adaptive threshold (chống ánh sáng không đều, lộ hình tối/sáng)
    Sau đó hợp nhất + đóng biên hở.
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (blur_k, blur_k), 0)

    # Cạnh sắc nét
    edges = cv2.Canny(blurred, 40, 140)

    # Adaptive threshold xử lý ánh sáng không đều trên giấy A4
    adaptive = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV,
        25, 7,
    )

    binary = cv2.bitwise_or(edges, adaptive)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    binary = cv2.dilate(binary, kernel, iterations=1)
    return binary


def detect_shapes(image_bgr: np.ndarray, settings: dict, draw: bool = True) -> dict:
    """Phát hiện mọi hình học trong ảnh.

    draw=True  → trả kèm ảnh đã chú thích (dùng khi "Chụp & lưu" / tải ảnh lên).
    draw=False → bỏ qua khâu vẽ + mã hóa ảnh — nhẹ hơn nhiều, phục vụ realtime.
    """
    min_area = int(settings.get("min_area", 600))
    epsilon_ratio = float(settings.get("approx_epsilon", 0.04))
    blur_k = int(settings.get("blur_kernel", 5))
    draw_labels = bool(settings.get("draw_labels", True))
    if blur_k % 2 == 0:
        blur_k += 1

    ml_classifier.ensure_ready()

    binary = _build_binary(image_bgr, blur_k)

    # RETR_LIST: lấy MỌI contour (cả trong lẫn ngoài) thay vì chỉ outer →
    # trường hợp ảnh chụp tờ A4 có hình ở giữa, hình bên trong vẫn được lấy.
    # Khung A4 sẽ bị lọc bằng _is_likely_frame() ở dưới.
    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    output = image_bgr.copy() if draw else None
    shapes: List[dict] = []
    palette = [(46, 171, 123), (232, 119, 34), (96, 165, 250), (245, 158, 11), (167, 139, 250)]
    img_h, img_w = image_bgr.shape[:2]
    min_conf = float(settings.get("min_confidence", 0.5))

    # === LỌC NHIỄU 3 TẦNG ===
    # Tầng 1 (rẻ): lọc theo kích thước + khung A4 + tỉ lệ lấp đầy (loại bbox rỗng)
    raw_candidates = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if _is_likely_frame(x, y, w, h, area, img_w, img_h):
            continue
        # Lọc A: tỉ lệ lấp đầy. Contour có bbox to nhưng rỗng (vd ôm phần
        # trắng giữa các nét) → fill_ratio thấp → loại. Tam giác lệch ~ 0.5,
        # nét bút tạo bbox rỗng ~ 0.05-0.10.
        bbox_area = w * h
        fill_ratio = area / bbox_area if bbox_area > 0 else 0
        if fill_ratio < _MIN_FILL_RATIO:
            continue
        raw_candidates.append((area, contour, (x, y, w, h)))

    # Tầng 2 (đắt): chạy CNN cho từng candidate, lọc theo confidence
    classified = []  # mỗi item: (confidence, kind, contour, box, approx)
    for area, contour, box in raw_candidates:
        x, y, w, h = box
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon_ratio * peri, True)

        pad = max(8, int(0.25 * max(w, h)))
        x0, y0 = max(0, x - pad), max(0, y - pad)
        x1, y1 = min(img_w, x + w + pad), min(img_h, y + h + pad)
        region = image_bgr[y0:y1, x0:x1]
        if region.size == 0:
            continue
        region_preprocessed = _preprocess_region(region)
        kind, confidence = ml_classifier.classify(region_preprocessed)
        # Lọc D: ngưỡng confidence (mặc định 0.7) — loại bỏ dự đoán mập mờ
        if confidence < min_conf:
            continue
        classified.append((confidence, kind, contour, box, approx))

    # Tầng 3 (NMS): với 2 bbox trùng nhau IoU > 0.3, giữ cái CNN tin tưởng hơn.
    # Sắp xếp theo confidence giảm dần để greedy giữ từ tin cậy cao xuống thấp.
    classified.sort(key=lambda t: t[0], reverse=True)
    kept = []  # [(confidence, kind, contour, box, approx)]
    for cand in classified:
        cand_box = cand[3]
        overlap = False
        for kept_item in kept:
            if _bbox_iou(cand_box, kept_item[3]) > _NMS_IOU_THRESHOLD:
                overlap = True
                break
        if not overlap:
            kept.append(cand)

    for confidence, kind, contour, (x, y, w, h), approx in kept:
        props = _properties(contour, approx)
        detail = _shape_detail(kind, approx, contour)
        idx = len(shapes)
        color = palette[idx % len(palette)]

        shapes.append({
            "stt": idx + 1,
            "loai": kind,
            "ten_hinh": SHAPE_NAMES.get(kind, kind),
            "do_tin_cay": round(confidence, 4),
            "so_dinh": props["so_dinh"],
            "box": [x, y, x + w, y + h],
            "thong_so": props,
            "chi_tiet": detail,
        })

        if draw:
            if kind == "tron":
                (cx, cy), radius = cv2.minEnclosingCircle(contour)
                cv2.circle(output, (int(cx), int(cy)), int(radius), color, 3)
            else:
                cv2.drawContours(output, [approx], -1, color, 3)
            if draw_labels:
                cx, cy = props["toa_do_tam"]["x"], props["toa_do_tam"]["y"]
                # Chỉ vẽ số thứ tự — tiếng Việt sẽ render phía client (canvas)
                label = f"{idx + 1}"
                cv2.putText(output, label, (cx - 10, cy + 8), cv2.FONT_HERSHEY_SIMPLEX,
                            0.7, (255, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(output, label, (cx - 10, cy + 8), cv2.FONT_HERSHEY_SIMPLEX,
                            0.7, color, 1, cv2.LINE_AA)

    return {
        "image": encode_jpeg_data_url(output) if draw else None,
        "shapes": shapes,
        "tong_so_hinh": len(shapes),
    }


def render_saved(image_bgr: np.ndarray, shapes: List[dict], settings: dict) -> dict:
    """Vẽ ảnh kết quả từ danh sách shapes đã có sẵn (không gọi lại CNN).

    Dùng cho luồng "Chụp tức thời": frontend đã nhận live result, chỉ cần server
    vẽ + lưu lịch sử thay vì chạy lại toàn bộ pipeline nhận diện.

    Lưu ý: KHÔNG vẽ chữ bằng cv2.putText (không hỗ trợ tiếng Việt có dấu).
    Chỉ vẽ hộp — client sẽ render nhãn bằng canvas HTML (hỗ trợ đầy đủ UTF-8).
    """
    draw_labels = bool(settings.get("draw_labels", True))
    palette = [(46, 171, 123), (232, 119, 34), (96, 165, 250), (245, 158, 11), (167, 139, 250)]
    output = image_bgr.copy()

    for idx, shape in enumerate(shapes):
        color = palette[idx % len(palette)]
        x1, y1, x2, y2 = shape["box"]
        # Vẽ hộp viền
        cv2.rectangle(output, (x1, y1), (x2, y2), color, 3)
        # Chỉ vẽ số thứ tự (không có tiếng Việt)
        if draw_labels:
            label = f"{shape['stt']}"
            cv2.putText(output, label, (x1 + 5, y1 + 20), cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(output, label, (x1 + 5, y1 + 20), cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, color, 1, cv2.LINE_AA)

    return {
        "image": encode_jpeg_data_url(output),
        "shapes": shapes,
        "tong_so_hinh": len(shapes),
    }
