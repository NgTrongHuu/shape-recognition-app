from pydantic import BaseModel
from typing import Optional, List


class LoginRequest(BaseModel):
    email: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    name: str


class DetectBase64Request(BaseModel):
    image: str          # ảnh dạng data URL base64 (từ webcam)
    save: bool = True    # có lưu vào lịch sử không


class SaveDetectionRequest(BaseModel):
    """Lưu kết quả realtime mà không chạy lại CNN — phục vụ nút Chụp tức thời."""
    image: str          # ảnh gốc base64
    shapes: List[dict]  # danh sách shape lấy từ live result


class ObjectDetectRequest(BaseModel):
    image: str          # ảnh dạng data URL base64 (từ webcam) — nhận diện vật thể YOLO


class SettingsRequest(BaseModel):
    min_area: Optional[int] = None
    approx_epsilon: Optional[float] = None
    blur_kernel: Optional[int] = None
    unit: Optional[str] = None
    draw_labels: Optional[bool] = None
    min_confidence: Optional[float] = None


class CalcRequest(BaseModel):
    shape: str               # loại hình: tam_giac, vuong, chu_nhat, tron, ...
    params: dict             # các thông số đầu vào (cạnh, bán kính, ...)
