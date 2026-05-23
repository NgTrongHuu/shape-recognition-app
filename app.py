"""GeoVision – Hệ thống nhận diện & phân tích hình học. Điểm khởi chạy duy nhất."""
import os
import sys
import time
import socket
import threading
import webbrowser
from pathlib import Path

# Cho phép chạy `python app.py` từ bất kỳ thư mục làm việc nào
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Console Windows mặc định dùng cp1252 — ép UTF-8 để in được emoji/tiếng Việt
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, Request
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.config import HOST, PORT, DATA_DIR, IMAGES_DIR
from backend.routes.auth_routes import router as auth_router
from backend.routes.shape_routes import router as shape_router
from backend.routes.object_routes import router as object_router
from backend.routes.history_routes import router as history_router
from backend.routes.stats_routes import router as stats_router
from backend.routes.settings_routes import router as settings_router
from backend.services.auth_service import ensure_default_account
from backend.utils.logger import log_action, log_error

for d in (DATA_DIR, IMAGES_DIR):
    os.makedirs(d, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_default_account()
    log_action("APP_START", detail=f"Server started on port {PORT}")
    yield


app = FastAPI(
    title="GeoVision – Nhận diện Hình học",
    description="Hệ thống nhận diện & phân tích hình học bằng thị giác máy tính",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log_error("UNHANDLED_EXCEPTION", str(exc))
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Đã xảy ra lỗi hệ thống", "detail": str(exc)},
    )


app.include_router(auth_router)
app.include_router(shape_router)
app.include_router(object_router)
app.include_router(history_router)
app.include_router(stats_router)
app.include_router(settings_router)

# Ảnh kết quả nhận diện (phục vụ trang Lịch sử)
app.mount("/data/images", StaticFiles(directory=IMAGES_DIR), name="images")

# Frontend đã build
FRONTEND_DIST = Path(BASE_DIR) / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "message": "GeoVision API đang chạy",
            "docs": f"http://localhost:{PORT}/api/docs",
            "note": "Frontend chưa build. Chạy: cd frontend && npm install && npm run build",
        }


def _local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def open_browser():
    time.sleep(1.5)
    webbrowser.open(f"http://localhost:{PORT}")


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 55)
    print("  🔷 GEOVISION – NHẬN DIỆN HÌNH HỌC")
    print("  Hệ thống nhận diện & phân tích hình học bằng AI")
    print("=" * 55)
    print(f"\n  ✅ Server: http://localhost:{PORT}")
    print(f"  🌐 Mạng LAN: http://{_local_ip()}:{PORT}")
    print(f"  📖 API Docs: http://localhost:{PORT}/api/docs")
    if not FRONTEND_DIST.exists():
        print("\n  ⚠️  Frontend chưa build. Chạy: cd frontend && npm install && npm run build")
    print("\n  Nhấn Ctrl+C để dừng server")
    print("=" * 55 + "\n")

    if FRONTEND_DIST.exists():
        threading.Thread(target=open_browser, daemon=True).start()

    uvicorn.run("app:app", host=HOST, port=PORT, reload=False, log_level="warning")
