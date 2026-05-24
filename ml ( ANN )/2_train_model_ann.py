"""
Train ANN (Artificial Neural Network) cho nhận diện 6 loại hình.

ANN = chỉ Dense layers, không Conv2D.
Kiến trúc: Flatten → Dense(512) → Dense(256) → Dense(128) → Dense(6, softmax)

Chạy: python 2_train_model_ann.py
"""
import json
import csv
from pathlib import Path

import numpy as np
import cv2
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models

# Config
IMG_SIZE = 128
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "images"
MODEL_DIR = SCRIPT_DIR / "models"
LOGS_DIR = SCRIPT_DIR / "logs"

SHAPES = ["tam_giac", "vuong", "chu_nhat", "tron", "ngu_giac", "luc_giac"]
NUM_CLASSES = len(SHAPES)

MODEL_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)


def load_dataset():
    """Load ảnh từ images/ folder."""
    images = []
    labels = []

    for label_idx, shape_name in enumerate(SHAPES):
        shape_dir = DATA_DIR / shape_name
        if not shape_dir.exists():
            print(f"⚠️  Folder không tồn tại: {shape_dir}")
            continue

        files = sorted(list(shape_dir.glob("*.png")))
        print(f"📖 Load {shape_name}: {len(files)} ảnh")

        for img_path in files:
            img = cv2.imread(str(img_path))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # BGR → RGB
            images.append(img)
            labels.append(label_idx)

    images = np.array(images, dtype=np.float32) / 255.0
    labels = np.array(labels)

    print(f"\n📊 Dataset loaded:")
    print(f"   Images shape: {images.shape}")
    print(f"   Labels shape: {labels.shape}")

    return images, labels


def build_model():
    """Build ANN model (Flatten + Dense layers only)."""
    model = models.Sequential([
        layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3)),

        # ===== FLATTEN =====
        layers.Flatten(),

        # ===== Dense Layer 1 =====
        layers.Dense(512, activation="relu"),
        layers.BatchNormalization(),
        layers.Dropout(0.5),

        # ===== Dense Layer 2 =====
        layers.Dense(256, activation="relu"),
        layers.BatchNormalization(),
        layers.Dropout(0.3),

        # ===== Dense Layer 3 =====
        layers.Dense(128, activation="relu"),
        layers.BatchNormalization(),
        layers.Dropout(0.2),

        # ===== Output Layer =====
        layers.Dense(NUM_CLASSES, activation="softmax"),
    ])

    return model


def main():
    print("\n🧠 Train ANN for Shape Recognition...\n")

    # === Load Dataset ===
    images, labels = load_dataset()

    # === Split Data ===
    x_train, x_test, y_train, y_test = train_test_split(
        images, labels, test_size=0.2, random_state=42, stratify=labels
    )
    x_train, x_val, y_train, y_val = train_test_split(
        x_train, y_train, test_size=0.2, random_state=42, stratify=y_train
    )

    y_train = keras.utils.to_categorical(y_train, NUM_CLASSES)
    y_val = keras.utils.to_categorical(y_val, NUM_CLASSES)
    y_test = keras.utils.to_categorical(y_test, NUM_CLASSES)

    print(f"\n📂 Data split:")
    print(f"   Train: {x_train.shape[0]} ảnh")
    print(f"   Val:   {x_val.shape[0]} ảnh")
    print(f"   Test:  {x_test.shape[0]} ảnh")

    # === Build Model ===
    print(f"\n🏗️  Build ANN model...")
    model = build_model()
    model.summary()

    # === Compile ===
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    # === Train ===
    print(f"\n🚀 Training ANN model...")
    checkpoint = keras.callbacks.ModelCheckpoint(
        str(MODEL_DIR / "shape_model_ann_best.keras"),
        monitor="val_accuracy",
        save_best_only=True,
        mode="max",
    )

    early_stop = keras.callbacks.EarlyStopping(
        monitor="val_loss", patience=10, restore_best_weights=True
    )

    history = model.fit(
        x_train, y_train,
        validation_data=(x_val, y_val),
        epochs=50,
        batch_size=32,
        callbacks=[checkpoint, early_stop],
        verbose=1,
    )

    # === Evaluate ===
    print(f"\n📊 Evaluate on Test Set:")
    test_loss, test_acc = model.evaluate(x_test, y_test)
    print(f"   Loss: {test_loss:.4f}")
    print(f"   Accuracy: {test_acc:.4f}")

    # === Classification Report ===
    y_pred_probs = model.predict(x_test, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = np.argmax(y_test, axis=1)

    print(f"\n📈 Classification Report:")
    print(classification_report(y_true, y_pred, target_names=SHAPES, digits=4))

    # === Confusion Matrix ===
    cm = confusion_matrix(y_true, y_pred)
    print(f"\n🔲 Confusion Matrix:")
    print(cm)

    # === Save Model ===
    final_model_path = MODEL_DIR / "shape_model_ann.keras"
    model.save(str(final_model_path))
    print(f"\n✅ Model saved: {final_model_path}")

    # === Save Class Names ===
    class_names_path = MODEL_DIR / "class_names.json"
    with open(class_names_path, "w", encoding="utf-8") as f:
        json.dump(SHAPES, f, ensure_ascii=False, indent=2)
    print(f"✅ Class names saved: {class_names_path}")

    # === Save Training History ===
    history_path = LOGS_DIR / "training_history.csv"
    with open(history_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["epoch", "loss", "accuracy", "val_loss", "val_accuracy"])
        for i in range(len(history.history["loss"])):
            writer.writerow([
                i + 1,
                history.history["loss"][i],
                history.history["accuracy"][i],
                history.history["val_loss"][i],
                history.history["val_accuracy"][i],
            ])
    print(f"✅ History saved: {history_path}")

    print(f"\n🎉 Done!")


if __name__ == "__main__":
    main()
