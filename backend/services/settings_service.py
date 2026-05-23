from backend.config import SETTINGS_FILE, DEFAULT_SETTINGS
from backend.utils.data_manager import load_json, save_json
from backend.utils.logger import log_action
from backend.models.schemas import SettingsRequest


def get_settings() -> dict:
    """Đọc cài đặt, bổ sung giá trị mặc định cho khóa thiếu."""
    settings = load_json(SETTINGS_FILE, {})
    if not isinstance(settings, dict):
        settings = {}
    merged = {**DEFAULT_SETTINGS, **settings}
    return merged


def update_settings(req: SettingsRequest) -> dict:
    settings = get_settings()
    for key, value in req.model_dump(exclude_none=True).items():
        settings[key] = value

    # Ràng buộc giá trị hợp lệ
    settings["min_area"] = max(50, min(int(settings["min_area"]), 100000))
    settings["approx_epsilon"] = max(0.01, min(float(settings["approx_epsilon"]), 0.15))
    bk = int(settings["blur_kernel"])
    if bk % 2 == 0:
        bk += 1
    settings["blur_kernel"] = max(1, min(bk, 21))
    settings["min_confidence"] = max(0.0, min(float(settings["min_confidence"]), 1.0))

    save_json(SETTINGS_FILE, settings)
    log_action("UPDATE_SETTINGS", detail=str(settings))
    return settings


def reset_settings() -> dict:
    save_json(SETTINGS_FILE, dict(DEFAULT_SETTINGS))
    log_action("RESET_SETTINGS")
    return dict(DEFAULT_SETTINGS)
