# 🔷 GeoVision – Hệ thống Nhận diện Hình học

Ứng dụng nhận diện & phân tích hình học bằng thị giác máy tính (OpenCV).
Phát hiện hình từ webcam hoặc ảnh tải lên, tính diện tích – chu vi – góc tự động,
kèm máy tính hình học và thư viện công thức.

---

## 🚀 Khởi chạy

### Bước 1 — Cài thư viện Python
```bash
pip install -r requirements.txt
```

### Bước 2 — Build giao diện
```bash
cd frontend
npm install
npm run build
cd ..
```

### Bước 3 — Chạy hệ thống
```bash
python app.py
```

Trình duyệt tự mở tại **http://localhost:8000**

---

## 👤 Tài khoản mặc định

| Email | Mật khẩu |
|-------|----------|
| admin@geovision.app | secret |

Tài khoản được tạo tự động lần đầu chạy. Đổi mật khẩu trong trang **Cài đặt**.

---

## 🧩 Tính năng

- **Tổng quan** — thống kê số lượt nhận diện, phân bố loại hình, hoạt động theo ngày.
- **Nhận diện hình** — chụp webcam hoặc tải ảnh, phát hiện hình + phân tích thông số.
- **Lịch sử** — lưu lại mọi lượt nhận diện, xem chi tiết, tìm kiếm, xóa.
- **Tính toán hình học** — nhập kích thước, tính diện tích/chu vi/góc cho 9 loại hình.
- **Thư viện hình học** — tra cứu định nghĩa, tính chất, công thức.
- **Cài đặt** — tùy chỉnh tham số nhận diện, đơn vị, tài khoản.

---

## 🔧 Chế độ phát triển (2 server)

```bash
# Terminal 1 — backend
python app.py

# Terminal 2 — frontend (hot reload)
cd frontend && npm run dev
```

Giao diện dev: http://localhost:5173 (tự proxy API sang cổng 8000).

---

## 🧠 Công nghệ nhận diện

1. Chuyển ảnh sang thang xám, làm mờ Gaussian khử nhiễu.
2. Phát hiện biên bằng thuật toán Canny + đóng biên hở.
3. Tìm đường viền (contours), lọc theo diện tích tối thiểu.
4. Xấp xỉ đa giác (`approxPolyDP`) → đếm số đỉnh để phân loại hình.
5. Tính diện tích, chu vi, góc, độ tròn, bán kính... cho từng hình.

---

## 📁 Cấu trúc

```
shape-recognition-app/
├── app.py                 # Điểm khởi chạy (FastAPI)
├── requirements.txt
├── .env.example
├── backend/
│   ├── config.py
│   ├── auth/middleware.py
│   ├── models/schemas.py
│   ├── routes/            # auth, shapes, history, stats, settings
│   ├── services/          # shape_service (OpenCV), auth, history, stats, settings
│   └── utils/             # data_manager, security, logger
├── data/                  # JSON: account, history, settings + ảnh kết quả
└── frontend/              # React + Vite + Tailwind
    └── src/
        ├── components/    # layout, ui
        ├── pages/         # Login, Dashboard, Detect, History, Calculator, ShapeLibrary, Settings
        ├── services/api.ts
        └── store/AuthContext.tsx
```

---

**Yêu cầu:** Python 3.9+ · Node.js 18+ · Webcam (cho nhận diện trực tiếp)
