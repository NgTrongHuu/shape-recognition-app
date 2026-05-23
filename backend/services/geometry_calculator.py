"""Máy tính hình học — tính diện tích / chu vi / thông số phái sinh.

Tách khỏi shape_service.py: phần này thuần toán học từ kích thước người dùng
nhập tay, KHÔNG liên quan tới pipeline nhận diện ảnh (OpenCV + model CNN).
"""
import math

from fastapi import HTTPException


def _need(params: dict, *keys) -> list:
    """Lấy & kiểm tra các thông số bắt buộc — mỗi giá trị phải là số dương."""
    out = []
    for k in keys:
        if k not in params or params[k] is None:
            raise HTTPException(status_code=400, detail=f"Thiếu thông số: {k}")
        try:
            val = float(params[k])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"Thông số '{k}' phải là số")
        if val <= 0:
            raise HTTPException(status_code=400, detail=f"Thông số '{k}' phải lớn hơn 0")
        out.append(val)
    return out


def _r2(x: float) -> float:
    """Làm tròn 2 chữ số thập phân."""
    return round(x, 2)


# --- Mỗi loại hình một hàm tính (thay cho chuỗi if dài trước đây) ----------

def _calc_vuong(params: dict) -> dict:
    (a,) = _need(params, "canh")
    return {"dien_tich": _r2(a * a), "chu_vi": _r2(4 * a),
            "duong_cheo": _r2(a * math.sqrt(2))}


def _calc_chu_nhat(params: dict) -> dict:
    a, b = _need(params, "chieu_dai", "chieu_rong")
    return {"dien_tich": _r2(a * b), "chu_vi": _r2(2 * (a + b)),
            "duong_cheo": _r2(math.hypot(a, b))}


def _calc_tron(params: dict) -> dict:
    (r,) = _need(params, "ban_kinh")
    return {"dien_tich": _r2(math.pi * r * r), "chu_vi": _r2(2 * math.pi * r),
            "duong_kinh": _r2(2 * r)}


def _calc_tam_giac(params: dict) -> dict:
    a, b, c = _need(params, "canh_a", "canh_b", "canh_c")
    if a + b <= c or a + c <= b or b + c <= a:
        raise HTTPException(status_code=400, detail="Ba cạnh không tạo thành tam giác")
    s = (a + b + c) / 2
    area = math.sqrt(s * (s - a) * (s - b) * (s - c))
    ang = lambda x, y, z: round(math.degrees(math.acos(
        max(-1, min(1, (y * y + z * z - x * x) / (2 * y * z))))), 1)
    return {"dien_tich": _r2(area), "chu_vi": _r2(a + b + c),
            "chieu_cao_canh_a": _r2(2 * area / a),
            "goc": [ang(a, b, c), ang(b, a, c), ang(c, a, b)]}


def _calc_tam_giac_vuong(params: dict) -> dict:
    a, b = _need(params, "canh_goc_vuong_1", "canh_goc_vuong_2")
    c = math.hypot(a, b)
    return {"dien_tich": _r2(a * b / 2), "chu_vi": _r2(a + b + c), "canh_huyen": _r2(c)}


def _calc_hinh_thang(params: dict) -> dict:
    a, b, h = _need(params, "day_lon", "day_nho", "chieu_cao")
    return {"dien_tich": _r2((a + b) * h / 2), "duong_trung_binh": _r2((a + b) / 2)}


def _calc_binh_hanh(params: dict) -> dict:
    a, b, h = _need(params, "canh_day", "canh_ben", "chieu_cao")
    return {"dien_tich": _r2(a * h), "chu_vi": _r2(2 * (a + b))}


def _calc_thoi(params: dict) -> dict:
    d1, d2 = _need(params, "duong_cheo_1", "duong_cheo_2")
    canh = math.hypot(d1 / 2, d2 / 2)
    return {"dien_tich": _r2(d1 * d2 / 2), "chu_vi": _r2(4 * canh), "canh": _r2(canh)}


def _calc_da_giac_deu(params: dict) -> dict:
    (n,) = _need(params, "so_canh")
    (a,) = _need(params, "do_dai_canh")
    n = int(n)
    if n < 3:
        raise HTTPException(status_code=400, detail="Đa giác cần tối thiểu 3 cạnh")
    area = (n * a * a) / (4 * math.tan(math.pi / n))
    return {"dien_tich": _r2(area), "chu_vi": _r2(n * a),
            "tong_goc_trong": _r2((n - 2) * 180),
            "moi_goc": _r2((n - 2) * 180 / n)}


# Bảng điều phối: loại hình → hàm tính tương ứng
_CALCULATORS = {
    "vuong": _calc_vuong,
    "chu_nhat": _calc_chu_nhat,
    "tron": _calc_tron,
    "tam_giac": _calc_tam_giac,
    "tam_giac_vuong": _calc_tam_giac_vuong,
    "hinh_thang": _calc_hinh_thang,
    "binh_hanh": _calc_binh_hanh,
    "thoi": _calc_thoi,
    "da_giac_deu": _calc_da_giac_deu,
}


def calculate(shape: str, params: dict) -> dict:
    """Tính diện tích / chu vi / thông số phái sinh cho 1 hình từ kích thước nhập vào."""
    handler = _CALCULATORS.get(shape)
    if handler is None:
        raise HTTPException(status_code=400, detail=f"Không hỗ trợ hình: {shape}")
    return handler(params)
