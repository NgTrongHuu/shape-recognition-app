import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "geovision-shape-recognition-secret-key-2024")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Tài khoản mặc định (app 1 người dùng) — tự tạo khi chạy lần đầu
DEFAULT_EMAIL = os.getenv("DEFAULT_EMAIL", "admin@geovision.app")
DEFAULT_PASSWORD = os.getenv("DEFAULT_PASSWORD", "secret")
DEFAULT_NAME = os.getenv("DEFAULT_NAME", "Người dùng")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, os.getenv("DATA_DIR", "data"))

ACCOUNT_FILE = os.path.join(DATA_DIR, "account.json")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
IMAGES_DIR = os.path.join(DATA_DIR, "images")
BACKUPS_DIR = os.path.join(DATA_DIR, "backups")
LOGS_DIR = os.path.join(DATA_DIR, "logs")

# Model nhận diện vật thể YOLOv8 (COCO 80 lớp) — tự tải về lần đầu chạy
ML_MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
# YOLOv8s: cân bằng tốc độ/chính xác trên CPU (mAP 44.9 vs 37.3 của nano)
YOLO_VARIANT = os.getenv("YOLO_VARIANT", "yolov8s")
YOLO_MODEL_PATH = os.path.join(ML_MODELS_DIR, f"{YOLO_VARIANT}.pt")
YOLO_ONNX_PATH = os.path.join(ML_MODELS_DIR, f"{YOLO_VARIANT}.onnx")
YOLO_MIN_CONFIDENCE = float(os.getenv("YOLO_MIN_CONFIDENCE", "0.4"))
# Kích thước input — nhỏ hơn 640 → nhanh hơn nhiều, chính xác giảm chút
YOLO_IMG_SIZE = int(os.getenv("YOLO_IMG_SIZE", "480"))

# HuggingFace Inference Router — nhận diện hình từ webcam bằng Qwen2.5-VL
# (Miễn phí, không cần thẻ credit)
HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_VISION_MODEL = os.getenv("HF_VISION_MODEL", "Qwen/Qwen2.5-VL-72B-Instruct")

# Tham số nhận diện hình học mặc định (có thể chỉnh trong trang Cài đặt)
DEFAULT_SETTINGS = {
    "min_area": 600,            # diện tích contour tối thiểu (px²) để được tính là 1 hình
    "approx_epsilon": 0.04,     # độ "thô" khi xấp xỉ đa giác (càng lớn càng ít đỉnh)
    "blur_kernel": 5,           # kích thước làm mờ Gaussian khử nhiễu
    "unit": "px",               # đơn vị đo hiển thị
    "draw_labels": True,        # vẽ tên hình lên ảnh kết quả
    "min_confidence": 0.7,      # ngưỡng độ tin cậy tối thiểu của model CNN (0.0–1.0) — cao hơn = ít nhiễu
}
