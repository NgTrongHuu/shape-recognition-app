import { useEffect, useRef, useState } from 'react'
import type Webcam from 'react-webcam'

interface Options {
  enabled: boolean
  intervalMs?: number
  /** Resize ảnh trước khi gửi server — giảm payload, tăng FPS. 0 = không resize. */
  maxWidth?: number
  /** Chất lượng JPEG khi resize (0-1). */
  quality?: number
}

/**
 * Vòng lặp nhận diện realtime trên webcam.
 *
 * Nguyên tắc:
 *  - Mỗi lượt: chụp 1 khung → resize → gọi `detect` → lưu kết quả.
 *  - Khung kế chỉ bắt đầu sau khi khung trước xong (không chồng request).
 *  - Tự pause khi tab ẩn (document.hidden) để khỏi tốn CPU/server.
 *  - Cung cấp `lastShot` để parent dùng lại frame cuối (vd nút "Chụp" tức thời).
 */
export function useRealtimeDetection<T>(
  webcamRef: React.RefObject<Webcam>,
  detect: (image: string, signal?: AbortSignal) => Promise<T>,
  { enabled, intervalMs = 500, maxWidth = 480, quality = 0.7 }: Options,
) {
  const [result, setResult] = useState<T | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const detectRef = useRef(detect)
  detectRef.current = detect
  const lastShotRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setBusy(false)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | null = null

    const downscale = (dataUrl: string): Promise<string> =>
      new Promise((resolve) => {
        if (!maxWidth) return resolve(dataUrl)
        const img = new Image()
        img.onload = () => {
          if (img.width <= maxWidth) return resolve(dataUrl)
          const scale = maxWidth / img.width
          const w = maxWidth
          const h = Math.round(img.height * scale)
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(dataUrl)
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = () => resolve(dataUrl)
        img.src = dataUrl
      })

    const loop = async () => {
      if (cancelled) return
      // Tab ẩn → bỏ qua hẳn lượt này, chờ lượt sau
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(loop, intervalMs)
        return
      }
      const shot = webcamRef.current?.getScreenshot()
      if (shot) {
        lastShotRef.current = shot
        const small = await downscale(shot)
        if (cancelled) return
        controller = new AbortController()
        setBusy(true)
        try {
          const r = await detectRef.current(small, controller.signal)
          if (!cancelled) {
            setResult(r)
            setError(null)
          }
        } catch (e: any) {
          if (cancelled) return
          // Bỏ qua lỗi do abort — đó là chủ ý
          if (e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') {
            // ignore
          } else {
            setError(e?.response?.data?.detail || 'Nhận diện thất bại')
          }
        } finally {
          if (!cancelled) setBusy(false)
        }
      }
      if (!cancelled) timer = setTimeout(loop, intervalMs)
    }

    const onVisibility = () => {
      // Khi tab ẩn, hủy request đang chạy để khỏi tốn băng thông
      if (document.hidden && controller) {
        controller.abort()
        controller = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    loop()
    return () => {
      cancelled = true
      clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs, maxWidth, quality])

  return { result, busy, error, lastShotRef }
}
