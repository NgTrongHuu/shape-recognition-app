/**
 * YOLOv8 chạy trực tiếp trên browser bằng onnxruntime-web.
 *
 * Pipeline:
 *   video → canvas (letterbox 480x480) → Float32 NCHW → onnxruntime → postprocess + NMS
 *
 * Lý do nhanh: KHÔNG gửi ảnh lên server, mọi thứ làm trong browser bằng WASM
 * (có SIMD + multi-thread). Trên CPU laptop bình thường đạt 15-25 FPS với
 * YOLOv8s @ 480px.
 */
import * as ort from 'onnxruntime-web'

export interface YoloDetection {
  classId: number
  label: string
  ten: string
  confidence: number
  box: [number, number, number, number] // [x1, y1, x2, y2] theo pixel ảnh gốc
}

export interface ClassInfo {
  id: number
  label: string
  ten: string
}

export interface YoloConfig {
  modelUrl: string
  classes: ClassInfo[]
  imgsz: number
  confThreshold: number
  iouThreshold?: number
}

export class YoloWeb {
  private session: ort.InferenceSession | null = null
  private readonly cfg: YoloConfig
  // Canvas tái sử dụng — tránh tạo mới mỗi frame
  private preCanvas = document.createElement('canvas')
  private preCtx: CanvasRenderingContext2D
  private buffer: Float32Array | null = null

  constructor(cfg: YoloConfig) {
    this.cfg = { iouThreshold: 0.45, ...cfg }
    this.preCanvas.width = cfg.imgsz
    this.preCanvas.height = cfg.imgsz
    const ctx = this.preCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Browser không hỗ trợ canvas 2D')
    this.preCtx = ctx
  }

  async init(): Promise<void> {
    if (this.session) return
    // Trỏ về CDN WASM cho onnxruntime — chuẩn của ort 1.19
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/'
    ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2)
    ort.env.wasm.simd = true

    this.session = await ort.InferenceSession.create(this.cfg.modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    this.buffer = new Float32Array(3 * this.cfg.imgsz * this.cfg.imgsz)
  }

  /** Letterbox: scale ảnh giữ tỉ lệ, pad 2 bên bằng màu xám 114. */
  private letterbox(video: HTMLVideoElement | HTMLCanvasElement, sw: number, sh: number) {
    const sz = this.cfg.imgsz
    const scale = Math.min(sz / sw, sz / sh)
    const nw = Math.round(sw * scale)
    const nh = Math.round(sh * scale)
    const dx = Math.floor((sz - nw) / 2)
    const dy = Math.floor((sz - nh) / 2)

    this.preCtx.fillStyle = 'rgb(114,114,114)'
    this.preCtx.fillRect(0, 0, sz, sz)
    this.preCtx.drawImage(video, 0, 0, sw, sh, dx, dy, nw, nh)
    return { scale, dx, dy }
  }

  /** RGBA Uint8 → Float32 NCHW [0,1]. */
  private toTensor(imageData: ImageData): ort.Tensor {
    const sz = this.cfg.imgsz
    const data = imageData.data
    const out = this.buffer!
    const plane = sz * sz
    let pIdx = 0
    for (let i = 0; i < data.length; i += 4) {
      // R
      out[pIdx] = data[i] / 255
      // G
      out[pIdx + plane] = data[i + 1] / 255
      // B
      out[pIdx + 2 * plane] = data[i + 2] / 255
      pIdx++
    }
    return new ort.Tensor('float32', out, [1, 3, sz, sz])
  }

  /** YOLOv8 output shape: [1, 84, 8400] — 4 box + 80 class scores. */
  private postprocess(
    output: Float32Array,
    dims: readonly number[],
    meta: { scale: number; dx: number; dy: number; origW: number; origH: number },
  ): YoloDetection[] {
    // dims = [1, 84, N]
    const numClasses = this.cfg.classes.length
    const stride = dims[2]
    const conf = this.cfg.confThreshold

    const candidates: {
      cx: number; cy: number; w: number; h: number
      score: number; cls: number
    }[] = []

    for (let i = 0; i < stride; i++) {
      // Tìm class có score cao nhất
      let bestCls = 0
      let bestScore = output[4 * stride + i]
      for (let c = 1; c < numClasses; c++) {
        const s = output[(4 + c) * stride + i]
        if (s > bestScore) {
          bestScore = s
          bestCls = c
        }
      }
      if (bestScore < conf) continue
      candidates.push({
        cx: output[i],
        cy: output[stride + i],
        w: output[2 * stride + i],
        h: output[3 * stride + i],
        score: bestScore,
        cls: bestCls,
      })
    }

    // NMS theo class
    candidates.sort((a, b) => b.score - a.score)
    const keep: typeof candidates = []
    const iouTh = this.cfg.iouThreshold!
    for (const c of candidates) {
      let suppressed = false
      for (const k of keep) {
        if (k.cls !== c.cls) continue
        if (iou(c, k) > iouTh) { suppressed = true; break }
      }
      if (!suppressed) keep.push(c)
      if (keep.length >= 100) break
    }

    // Chuyển từ tọa độ trong ảnh letterbox về tọa độ ảnh gốc
    return keep.map((c) => {
      const x1 = (c.cx - c.w / 2 - meta.dx) / meta.scale
      const y1 = (c.cy - c.h / 2 - meta.dy) / meta.scale
      const x2 = (c.cx + c.w / 2 - meta.dx) / meta.scale
      const y2 = (c.cy + c.h / 2 - meta.dy) / meta.scale
      const info = this.cfg.classes[c.cls]
      return {
        classId: c.cls,
        label: info?.label ?? String(c.cls),
        ten: info?.ten ?? info?.label ?? String(c.cls),
        confidence: c.score,
        box: [
          Math.max(0, Math.round(x1)),
          Math.max(0, Math.round(y1)),
          Math.min(meta.origW, Math.round(x2)),
          Math.min(meta.origH, Math.round(y2)),
        ],
      }
    })
  }

  async detect(video: HTMLVideoElement): Promise<YoloDetection[]> {
    if (!this.session) throw new Error('YoloWeb chưa init')
    const sw = video.videoWidth
    const sh = video.videoHeight
    if (!sw || !sh) return []
    const { scale, dx, dy } = this.letterbox(video, sw, sh)
    const imgData = this.preCtx.getImageData(0, 0, this.cfg.imgsz, this.cfg.imgsz)
    const input = this.toTensor(imgData)
    const inputName = this.session.inputNames[0]
    const results = await this.session.run({ [inputName]: input })
    const out = results[this.session.outputNames[0]]
    return this.postprocess(out.data as Float32Array, out.dims, {
      scale, dx, dy, origW: sw, origH: sh,
    })
  }

  dispose(): void {
    this.session?.release()
    this.session = null
  }
}

function iou(
  a: { cx: number; cy: number; w: number; h: number },
  b: { cx: number; cy: number; w: number; h: number },
): number {
  const ax1 = a.cx - a.w / 2, ay1 = a.cy - a.h / 2
  const ax2 = a.cx + a.w / 2, ay2 = a.cy + a.h / 2
  const bx1 = b.cx - b.w / 2, by1 = b.cy - b.h / 2
  const bx2 = b.cx + b.w / 2, by2 = b.cy + b.h / 2
  const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1)
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2)
  const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1)
  const inter = iw * ih
  const areaA = (ax2 - ax1) * (ay2 - ay1)
  const areaB = (bx2 - bx1) * (by2 - by1)
  return inter / (areaA + areaB - inter + 1e-9)
}
