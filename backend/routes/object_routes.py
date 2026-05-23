from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from backend.models.schemas import ObjectDetectRequest
from backend.services.object_service import (
    detect_objects, ensure_onnx_exported,
    COCO_CLASSES_ORDER, COCO_VI,
)
from backend.utils.image_codec import decode_base64_image
from backend.auth.middleware import get_current_user
from backend.config import YOLO_IMG_SIZE, YOLO_MIN_CONFIDENCE, YOLO_VARIANT

router = APIRouter(prefix="/api/v1/objects", tags=["Objects"])


@router.post("/detect")
def detect(req: ObjectDetectRequest, user=Depends(get_current_user)):
    """Server-side YOLO — fallback khi browser không chạy được ONNX Web."""
    image = decode_base64_image(req.image)
    return {"success": True, "data": detect_objects(image)}


@router.get("/classes")
def classes():
    """Danh sách 80 lớp COCO + tên tiếng Việt + tham số inference.

    Frontend dùng để map cls_id từ model ONNX về tên hiển thị.
    """
    return {
        "success": True,
        "data": {
            "variant": YOLO_VARIANT,
            "imgsz": YOLO_IMG_SIZE,
            "conf": YOLO_MIN_CONFIDENCE,
            "classes": [
                {"id": i, "label": name, "ten": COCO_VI.get(name, name)}
                for i, name in enumerate(COCO_CLASSES_ORDER)
            ],
        },
    }


@router.get("/model")
def serve_model():
    """Trả file ONNX để frontend chạy YOLO ngay trên browser (onnxruntime-web).

    Export lười: lần đầu gọi sẽ tốn vài giây để chuyển .pt → .onnx, sau đó cache.
    """
    onnx_path = ensure_onnx_exported()
    return FileResponse(
        str(onnx_path),
        media_type="application/octet-stream",
        filename=onnx_path.name,
        headers={"Cache-Control": "public, max-age=86400"},
    )
