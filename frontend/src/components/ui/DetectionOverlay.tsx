import { useEffect, useRef } from 'react'
import type Webcam from 'react-webcam'

export interface OverlayBox {
  /** Tọa độ khung [x1, y1, x2, y2] theo pixel của ảnh gốc từ webcam. */
  box: [number, number, number, number]
  /** Nhãn hiển thị — vẽ bằng canvas nên hỗ trợ tiếng Việt có dấu. */
  label: string
}

const COLORS = ['#2EAB7B', '#E87722', '#60A5FA', '#F59E0B', '#A78BFA', '#F472B6', '#34D399']

/**
 * Lớp phủ vẽ khung nhận diện TRỰC TIẾP lên cửa sổ camera.
 *
 * Khung do server trả về tính theo pixel ảnh gốc. Video lại hiển thị bằng
 * `object-cover` (bị scale + cắt bớt), nên ở đây quy đổi lại đúng tỉ lệ.
 */
export default function DetectionOverlay({
  webcamRef,
  boxes,
}: {
  webcamRef: React.RefObject<Webcam>
  boxes: OverlayBox[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    canvas.width = cw
    canvas.height = ch
    ctx.clearRect(0, 0, cw, ch)

    const video = webcamRef.current?.video
    const vw = video?.videoWidth ?? 0
    const vh = video?.videoHeight ?? 0
    if (!vw || !vh) return

    // object-cover: video phủ kín khung → lấy hệ số scale lớn hơn rồi căn giữa
    const scale = Math.max(cw / vw, ch / vh)
    const dx = (cw - vw * scale) / 2
    const dy = (ch - vh * scale) / 2

    boxes.forEach((b, i) => {
      const color = COLORS[i % COLORS.length]
      const [x1, y1, x2, y2] = b.box
      const rx = x1 * scale + dx
      const ry = y1 * scale + dy
      const rw = (x2 - x1) * scale
      const rh = (y2 - y1) * scale

      ctx.lineWidth = 2.5
      ctx.strokeStyle = color
      ctx.strokeRect(rx, ry, rw, rh)

      ctx.font = '600 13px Inter, system-ui, sans-serif'
      const padX = 5
      const th = 19
      const tw = ctx.measureText(b.label).width + padX * 2
      const labelY = ry - th >= 0 ? ry - th : ry
      ctx.fillStyle = color
      ctx.fillRect(rx, labelY, tw, th)
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.label, rx + padX, labelY + th / 2 + 1)
    })
  }, [boxes, webcamRef])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}
