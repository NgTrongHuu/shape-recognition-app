import json
import sys
from pathlib import Path
import cv2
import numpy as np

# === Config ===
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_DIR = SCRIPT_DIR / "models"
MODEL_PATH = MODEL_DIR / "shape_model_ann.keras"
CLASS_NAMES_PATH = MODEL_DIR / "class_names.json"

IMG_SIZE = 128

# === Load Model ===
try:
    import tensorflow as tf
    _model = tf.keras.models.load_model(str(MODEL_PATH))
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        CLASS_NAMES = json.load(f)
except Exception as e:
    print(f" Không nạp được model: {e}")
    print(f"   Hãy huấn luyện bằng: python 2_train_model_ann.py")
    sys.exit(1)


def preprocess_image(image_bgr: np.ndarray) -> np.ndarray:
    """Tiền xử lý ảnh để khớp format training."""
    if len(image_bgr.shape) == 2:
        image_bgr = cv2.cvtColor(image_bgr, cv2.COLOR_GRAY2RGB)
    elif image_bgr.shape[2] == 4:
        image_bgr = cv2.cvtColor(image_bgr, cv2.COLOR_BGRA2RGB)
    else:
        image_bgr = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    image_bgr = cv2.resize(image_bgr, (IMG_SIZE, IMG_SIZE))
    return image_bgr.astype(np.float32) / 255.0


def predict(image_bgr: np.ndarray) -> tuple:
    """Dự đoán loại hình từ ảnh."""
    preprocessed = preprocess_image(image_bgr)
    batch = np.expand_dims(preprocessed, axis=0)
    probs = _model.predict(batch, verbose=0)[0]
    idx = int(np.argmax(probs))
    shape_name = CLASS_NAMES[idx]
    confidence = float(probs[idx])
    return shape_name, confidence


def demo_predict_from_file(image_path: str):
    """Demo: Dự đoán từ file ảnh."""
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f" File ảnh không tồn tại: {image_path}")

    img = cv2.imread(str(image_path))
    if img is None:
        raise FileNotFoundError(f" Không đọc được file ảnh: {image_path}")

    print(f"\n📷 Dự đoán từ file: {image_path}")
    shape_name, confidence = predict(img)
    print(f"   Hình: {shape_name}")
    print(f"   Độ tin cậy: {confidence:.4f}")

    # Draw result
    img_display = cv2.cvtColor(
        cv2.resize(img, (IMG_SIZE, IMG_SIZE)),
        cv2.COLOR_RGB2BGR
    )
    cv2.putText(
        img_display,
        f"{shape_name} ({confidence:.2%})",
        (10, 30),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
        cv2.LINE_AA,
    )

    cv2.imshow("Prediction Result (ANN)", img_display)
    cv2.waitKey(0)
    cv2.destroyAllWindows()


def demo_predict_from_camera():
    """Demo: Dự đoán real-time từ webcam."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print(" Không mở được webcam")
        return

    print("\n📷 Dự đoán từ webcam (nhấn 'q' để thoát)")
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        shape_name, confidence = predict(frame)
        color = (0, 255, 0) if confidence > 0.7 else (0, 165, 255)

        cv2.putText(
            frame,
            f"Shape: {shape_name}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            color,
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            f"Confidence: {confidence:.2%}",
            (10, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            1,
            cv2.LINE_AA,
        )

        cv2.imshow("Shape Recognition - ANN (Webcam)", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\n Cách dùng:")
        print("   python 3_predict.py <image_path>  # Dự đoán từ file")
        print("   python 3_predict.py --camera      # Dự đoán từ webcam")
        sys.exit(1)

    if sys.argv[1] == "--camera":
        demo_predict_from_camera()
    else:
        image_path = sys.argv[1]
        demo_predict_from_file(image_path)
