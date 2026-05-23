import React, { useCallback, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { ScanEye, Play, Square, AlertTriangle, Boxes, Loader2, Zap, Cloud } from 'lucide-react'
import { objectApi } from '../../services/api'
import { ObjectDetectResult } from '../../types'
import { useRealtimeDetection } from '../../hooks/useRealtimeDetection'
import { useBrowserYolo } from '../../hooks/useBrowserYolo'
import DetectionOverlay, { OverlayBox } from './DetectionOverlay'

const VIDEO_CONSTRAINTS = { facingMode: 'environment', width: 640, height: 480 }

/**
 * Card nhận diện vật thể realtime — 2 chế độ:
 *   1. Browser YOLO (ưu tiên): tải ONNX 1 lần, chạy on-device 15-25 FPS
 *   2. Server YOLO (fallback): nếu browser không chạy được model
 *
 * Tự chuyển fallback nếu init model thất bại, không cần user can thiệp.
 */
export default function ObjectDetectorCard() {
  const webcamRef = useRef<Webcam>(null)
  const [on, setOn] = useState(false)

  // --- Cánh ưu tiên: browser YOLO ---
  const yolo = useBrowserYolo(webcamRef, { enabled: on, targetFps: 25 })

  // --- Cánh fallback: server YOLO (chỉ kích hoạt khi browser fail) ---
  const useServer = yolo.status === 'fallback'
  const detectFrame = useCallback(
    (image: string, signal?: AbortSignal) =>
      objectApi.detect(image, signal).then((r) => r.data.data as ObjectDetectResult),
    [],
  )
  const server = useRealtimeDetection<ObjectDetectResult>(webcamRef, detectFrame, {
    enabled: on && useServer,
    intervalMs: 500,
    maxWidth: 480,
  })

  // Hợp nhất kết quả từ 2 đường để UI chỉ render 1 chỗ
  const detections = useServer
    ? (server.result?.objects ?? []).map((o) => ({
        ten: o.ten, confidence: o.do_tin_cay, box: o.box,
      }))
    : yolo.detections.map((d) => ({ ten: d.ten, confidence: d.confidence, box: d.box }))

  const boxes: OverlayBox[] = detections.map((d) => ({
    box: d.box as [number, number, number, number],
    label: `${d.ten} ${(d.confidence * 100).toFixed(0)}%`,
  }))

  const loading = on && yolo.status === 'loading'
  const errorMsg = useServer ? server.error : null

  return (
    <div className="card-premium rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ScanEye size={16} className="text-brand-light" /> Nhận diện vật thể realtime
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            YOLOv8 · 80 lớp COCO ·{' '}
            {useServer ? (
              <span className="text-amber-400 inline-flex items-center gap-1">
                <Cloud size={11} /> server
              </span>
            ) : (
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <Zap size={11} /> on-device
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOn((v) => !v)}
          className={`flex items-center gap-2 ${on ? 'btn-ghost' : 'btn-primary'}`}
        >
          {on ? <Square size={14} /> : <Play size={14} />}
          {on ? 'Dừng' : 'Bật camera'}
        </button>
      </div>

      {!on ? (
        <div className="h-56 flex flex-col items-center justify-center text-gray-600 border border-dashed border-white/10 rounded-xl">
          <Boxes size={40} className="mb-2" />
          <p className="text-sm">Bật camera để nhận diện vật thể theo thời gian thực</p>
          <p className="text-[11px] text-gray-700 mt-1">
            Lần đầu sẽ tải model ~25 MB, lần sau dùng cache
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={VIDEO_CONSTRAINTS}
            />
            <DetectionOverlay webcamRef={webcamRef} boxes={boxes} />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] text-white font-medium">REALTIME</span>
            </div>
            {/* Chỉ số FPS thực — chỉ hiện khi chạy browser YOLO */}
            {!useServer && yolo.status === 'ready' && yolo.fps > 0 && (
              <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2.5 py-1 text-[11px] text-emerald-300 font-mono">
                {yolo.fps.toFixed(1)} FPS
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                <Loader2 size={28} className="animate-spin text-brand-light mb-2" />
                <p className="text-xs text-white">Đang tải model AI...</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{yolo.message}</p>
              </div>
            )}
          </div>

          {errorMsg || yolo.status === 'error' ? (
            <div className="glass-light rounded-xl px-3 py-2.5 flex items-center gap-2 text-amber-400/90">
              <AlertTriangle size={15} />
              <p className="text-xs">{errorMsg || yolo.message}</p>
            </div>
          ) : (
            <div className="glass-light rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">Vật thể phát hiện</span>
                <span className="text-xs font-bold text-brand-light">{detections.length}</span>
              </div>
              {detections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {detections.map((o, i) => (
                    <span key={i} className="text-[11px] bg-white/5 text-white px-2 py-0.5 rounded-md">
                      {o.ten} · {(o.confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-600">
                  {yolo.status === 'ready' || useServer
                    ? 'Chưa thấy vật thể nào trong khung hình'
                    : 'Đang chuẩn bị model...'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
