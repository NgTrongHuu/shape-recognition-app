import { useEffect, useRef, useState } from 'react'
import type Webcam from 'react-webcam'
import api, { objectApi } from '../services/api'
import { YoloWeb, type YoloDetection, type ClassInfo } from '../lib/yoloWeb'

interface Options {
  enabled: boolean
  /** FPS mong muốn — vòng lặp sẽ throttle nếu hardware không theo kịp. */
  targetFps?: number
}

interface State {
  detections: YoloDetection[]
  status: 'idle' | 'loading' | 'ready' | 'error' | 'fallback'
  message: string | null
  /** FPS thực đo từ vòng lặp inference. */
  fps: number
}

/**
 * Vòng lặp nhận diện vật thể CHẠY HOÀN TOÀN TRÊN BROWSER.
 *
 * Khác hẳn useRealtimeDetection (gửi ảnh lên server mỗi lần):
 *   - Load model ONNX 1 lần (cache HTTP), chạy bằng onnxruntime-web (WASM SIMD)
 *   - Mỗi frame inference trong khoảng 30-80ms tùy CPU → 15-30 FPS thực
 *   - Pause khi tab ẩn, abort khi unmount
 *
 * Khi nào fallback? Nếu load model lỗi (cũ trình duyệt, hết bộ nhớ, model
 * chưa export xong)  status='fallback' để UI gọi server-side thay vì hỏng.
 */
export function useBrowserYolo(webcamRef: React.RefObject<Webcam>, { enabled, targetFps = 25 }: Options): State {
  const [state, setState] = useState<State>({
    detections: [],
    status: 'idle',
    message: null,
    fps: 0,
  })
  const yoloRef = useRef<YoloWeb | null>(null)
  const classesRef = useRef<ClassInfo[] | null>(null)

  // Khởi tạo model 1 lần — đứng ngoài useEffect chính để không re-init khi enabled đổi
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      setState((s) => ({ ...s, status: 'loading', message: 'Đang tải metadata...' }))
      try {
        const meta = await objectApi.classes()
        if (cancelled) return
        const data = meta.data.data
        classesRef.current = data.classes

        // Tải model qua axios (có token + tiến trình) rồi tạo blob URL cho ort
        setState((s) => ({ ...s, message: 'Đang tải model ONNX...' }))
        const modelResp = await api.get('/objects/model', {
          responseType: 'blob',
          // Endpoint này export lười lần đầu (~10-20s), tăng timeout
          timeout: 120_000,
        })
        if (cancelled) return
        const blobUrl = URL.createObjectURL(modelResp.data as Blob)

        const yolo = new YoloWeb({
          modelUrl: blobUrl,
          classes: data.classes,
          imgsz: data.imgsz,
          confThreshold: data.conf,
        })
        setState((s) => ({ ...s, message: 'Đang khởi tạo runtime...' }))
        await yolo.init()
        URL.revokeObjectURL(blobUrl)
        if (cancelled) {
          yolo.dispose()
          return
        }
        yoloRef.current = yolo
        setState((s) => ({ ...s, status: 'ready', message: null }))
      } catch (e: any) {
        if (cancelled) return
        console.error('YoloWeb init failed:', e)
        setState((s) => ({
          ...s,
          status: 'fallback',
          message: 'Trình duyệt không chạy được model trên client, dùng server fallback.',
        }))
      }
    }

    init()
    return () => {
      cancelled = true
      yoloRef.current?.dispose()
      yoloRef.current = null
    }
  }, [])

  // Vòng lặp inference — chỉ chạy khi đã ready + enabled
  useEffect(() => {
    if (!enabled || state.status !== 'ready') return
    let cancelled = false
    let frameId: number | null = null
    let last = performance.now()
    const minDelta = 1000 / targetFps

    const loop = async () => {
      if (cancelled) return
      if (document.hidden) {
        frameId = window.setTimeout(loop, 200) as unknown as number
        return
      }
      const video = webcamRef.current?.video
      if (!video || video.readyState < 2) {
        frameId = requestAnimationFrame(loop)
        return
      }
      const t0 = performance.now()
      try {
        const detections = await yoloRef.current!.detect(video)
        if (cancelled) return
        const t1 = performance.now()
        const dt = t1 - last
        last = t1
        const fps = dt > 0 ? 1000 / dt : 0
        setState((s) => ({ ...s, detections, fps }))
        // Throttle nếu inference nhanh hơn targetFps để bớt tốn pin
        const wait = Math.max(0, minDelta - (t1 - t0))
        frameId = window.setTimeout(loop, wait) as unknown as number
      } catch (e) {
        console.error('YoloWeb inference error:', e)
        // Tiếp tục chạy — đừng dừng vì 1 frame lỗi
        frameId = requestAnimationFrame(loop)
      }
    }

    loop()
    return () => {
      cancelled = true
      if (frameId !== null) {
        clearTimeout(frameId)
        cancelAnimationFrame(frameId)
      }
    }
  }, [enabled, state.status, targetFps, webcamRef])

  return state
}
