import json
import numpy as np
import cv2
from pathlib import Path
from sklearn.model_selection import train_test_split
from keras.models import Sequential
from keras.layers import Dense, Flatten
from keras.utils import to_categorical

# === Config ===
IMG_SIZE = 128
SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR / "images"
MODEL_DIR = SCRIPT_DIR / "models"
LOGS_DIR = SCRIPT_DIR / "logs"

SHAPES = ["tam_giac", "vuong", "chu_nhat", "tron", "ngu_giac", "luc_giac"]
NUM_CLASSES = len(SHAPES)

MODEL_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# === Load Dataset ===
images = []
labels = []

for label_idx, shape_name in enumerate(SHAPES):
    shape_dir = DATA_DIR / shape_name
    if not shape_dir.exists():
        print(f"  Folder không tồn tại: {shape_dir}")
        continue

    files = sorted(list(shape_dir.glob("*.png")))
    print(f"📖 Load {shape_name}: {len(files)} ảnh")

    for img_path in files:
        img = cv2.imread(str(img_path))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        images.append(img)
        labels.append(label_idx)

images = np.array(images, dtype=np.float32) / 255.0
labels = np.array(labels)

print(f"\n📊 Dataset loaded:")
print(f"   Images shape: {images.shape}")
print(f"   Labels shape: {labels.shape}")

# === Split Data ===
x_train, x_test, y_train, y_test = train_test_split(
    images, labels, test_size=0.2, random_state=42, stratify=labels
)
x_train, x_val, y_train, y_val = train_test_split(
    x_train, y_train, test_size=0.2, random_state=42, stratify=y_train
)

# === Reshape ===
x_train = x_train.reshape((x_train.shape[0], IMG_SIZE*IMG_SIZE*3))
x_val = x_val.reshape((x_val.shape[0], IMG_SIZE*IMG_SIZE*3))
x_test = x_test.reshape((x_test.shape[0], IMG_SIZE*IMG_SIZE*3))

# === Normalize ===
x_train = x_train.astype('float32') / 255
x_val = x_val.astype('float32') / 255
x_test = x_test.astype('float32') / 255

# === Convert labels to categorical ===
y_train = to_categorical(y_train, NUM_CLASSES)
y_val = to_categorical(y_val, NUM_CLASSES)
y_test = to_categorical(y_test, NUM_CLASSES)

print(f"\n Data split:")
print(f"   Train: {x_train.shape[0]} ảnh, shape: {x_train.shape}")
print(f"   Val:   {x_val.shape[0]} ảnh, shape: {x_val.shape}")
print(f"   Test:  {x_test.shape[0]} ảnh, shape: {x_test.shape}")

# === Build Model ===
print(f"\n  Build ANN model...")
model = Sequential()
model.add(Flatten(input_shape=(IMG_SIZE*IMG_SIZE*3,)))
model.add(Dense(2000, activation='relu'))
model.add(Dense(1000, activation='relu'))
model.add(Dense(NUM_CLASSES, activation='softmax'))
model.summary()

# === Compile ===
model.compile(optimizer='rmsprop', loss='categorical_crossentropy', metrics=['accuracy'])

# === Train ===
print(f"\n🚀 Training ANN model...")
history = model.fit(x_train, y_train, validation_data=(x_val, y_val), epochs=100, batch_size=128)

# === Evaluate ===
print(f"\n📊 Evaluate on Test Set:")
test_loss, test_acc = model.evaluate(x_test, y_test)
print(f"   Loss: {test_loss:.4f}")
print(f"   Accuracy: {test_acc:.4f}")

# === Predict ===
y_pred_probs = model.predict(x_test, verbose=0)
y_pred = np.argmax(y_pred_probs, axis=1)

# === Save Model ===
final_model_path = MODEL_DIR / "shape_model_ann.keras"
model.save(str(final_model_path))
print(f"\n Model saved: {final_model_path}")

# === Save Class Names ===
class_names_path = MODEL_DIR / "class_names.json"
with open(class_names_path, "w", encoding="utf-8") as f:
    json.dump(SHAPES, f, ensure_ascii=False, indent=2)
print(f" Class names saved: {class_names_path}")

print(f"\n Done!")
