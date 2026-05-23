from fastapi import APIRouter, Depends, UploadFile, File, Form

from backend.models.schemas import DetectBase64Request, CalcRequest, SaveDetectionRequest
from backend.services.shape_service import detect_shapes, render_saved
from backend.services.hf_shape_service import detect_shapes_hf
from backend.services.geometry_calculator import calculate
from backend.services.settings_service import get_settings
from backend.services.history_service import add_record
from backend.utils.image_codec import decode_base64_image, decode_image_bytes
from backend.auth.middleware import get_current_user

router = APIRouter(prefix="/api/v1/shapes", tags=["Shapes"])


@router.post("/detect")
def detect(req: DetectBase64Request, user=Depends(get_current_user)):
    """Nhận diện hình từ ảnh webcam (base64)."""
    image = decode_base64_image(req.image)
    result = detect_shapes(image, get_settings(), draw=req.save)
    record = add_record(result, "webcam") if req.save else None
    return {"success": True, "data": result, "record_id": record["id"] if record else None}


@router.post("/detect-webcam")
def detect_webcam(req: DetectBase64Request, user=Depends(get_current_user)):
    """Nhận diện hình từ webcam bằng HuggingFace Router (Qwen2.5-VL-72B).

    Đường này TÁCH HOÀN TOÀN khỏi /detect (dùng CNN). Lý do:
    webcam có quá nhiều nhiễu (ánh sáng, nền, bóng) nên CNN tự train khó
    xử lý — chuyển sang vision-language model lớn để chịu nhiễu tốt hơn.
    """
    image = decode_base64_image(req.image)
    result = detect_shapes_hf(image, draw=req.save)
    record = add_record(result, "webcam") if req.save else None
    return {"success": True, "data": result, "record_id": record["id"] if record else None}


@router.post("/save")
def save_detection(req: SaveDetectionRequest, user=Depends(get_current_user)):
    """Lưu nhanh kết quả realtime đã detect: chỉ vẽ + lưu lịch sử.

    Frontend gửi kèm shapes lấy từ live result → server không phải chạy lại CNN
    → "Chụp & lưu" gần như tức thời thay vì chờ 4s.
    """
    image = decode_base64_image(req.image)
    result = render_saved(image, req.shapes, get_settings())
    record = add_record(result, "webcam")
    return {"success": True, "data": result, "record_id": record["id"]}


@router.post("/detect-upload")
def detect_upload(file: UploadFile = File(...), save: bool = Form(True),
                  user=Depends(get_current_user)):
    """Nhận diện hình từ ảnh tải lên."""
    image = decode_image_bytes(file.file.read())
    result = detect_shapes(image, get_settings())
    record = add_record(result, "upload") if save else None
    return {"success": True, "data": result, "record_id": record["id"] if record else None}


@router.post("/calculate")
def calculate_shape(req: CalcRequest, user=Depends(get_current_user)):
    """Tính diện tích / chu vi / thông số hình học từ kích thước nhập tay."""
    return {"success": True, "data": calculate(req.shape, req.params)}
