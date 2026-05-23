"""Tổng hợp thống kê từ lịch sử nhận diện (cho trang Tổng quan)."""
from collections import Counter
from datetime import datetime

from backend.config import HISTORY_FILE
from backend.utils.data_manager import load_json


def get_stats() -> dict:
    history = load_json(HISTORY_FILE, [])

    total_detections = len(history)
    total_shapes = sum(r.get("tong_so_hinh", 0) for r in history)

    # Đếm theo loại hình
    type_counter: Counter = Counter()
    for r in history:
        for name, count in r.get("tom_tat", {}).items():
            type_counter[name] += count

    by_type = [{"name": name, "value": count} for name, count in type_counter.most_common()]
    most_common = by_type[0]["name"] if by_type else "—"

    # Đếm số lần nhận diện theo nguồn
    source_counter: Counter = Counter(r.get("source", "khác") for r in history)

    # 5 lần nhận diện gần nhất
    recent = [
        {
            "id": r["id"],
            "timestamp": r["timestamp"],
            "source": r.get("source", ""),
            "tong_so_hinh": r.get("tong_so_hinh", 0),
            "image_url": r.get("image_url", ""),
        }
        for r in history[:5]
    ]

    # Hoạt động theo ngày (7 ngày gần nhất)
    day_counter: Counter = Counter()
    for r in history:
        try:
            day = datetime.fromisoformat(r["timestamp"]).strftime("%d/%m")
            day_counter[day] += 1
        except (ValueError, KeyError):
            pass

    return {
        "total_detections": total_detections,
        "total_shapes": total_shapes,
        "avg_shapes": round(total_shapes / total_detections, 1) if total_detections else 0,
        "most_common": most_common,
        "by_type": by_type,
        "by_source": [{"name": k, "value": v} for k, v in source_counter.items()],
        "recent": recent,
        "by_day": [{"day": k, "count": v} for k, v in list(day_counter.items())[-7:]],
    }
