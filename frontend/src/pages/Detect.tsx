import React, { useRef, useState } from 'react'
import Webcam from 'react-webcam'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Camera, Upload, ScanLine, RefreshCw, ImageIcon, Aperture, Radio, Sparkles,
} from 'lucide-react'
import { shapeApi, settingsApi } from '../services/api'
import { DetectResult } from '../types'
import ShapeCard from '../components/ui/ShapeCard'
import DetectionOverlay, { OverlayBox } from '../components/ui/DetectionOverlay'

type Mode = 'webcam' | 'upload'

const VIDEO_CONSTRAINTS = { facingMode: 'environment', width: 640, height: 480 }


export default function Detect() {
  const webcamRef = useRef<Webcam>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('webcam')
  const [captured, setCaptured] = useState<DetectResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [unit, setUnit] = useState('px')

  React.useEffect(() => {
    settingsApi.get().then((r) => setUnit(r.data.data.unit || 'px')).catch(() => {})
  }, [])

  // Webcam: Vision AI
  const capture = async () => {
    const shot = webcamRef.current?.getScreenshot()
    if (!shot) return toast.error('Không lấy được ảnh từ webcam')
    setBusy(true)
    setCaptured(null)
    try {
      const res = await shapeApi.detectWebcam(shot, true)
      const data: DetectResult = res.data.data
      setCaptured(data)
      if (data.tong_so_hinh === 0) {
        toast('Không phát hiện hình nào — thử đưa hình rõ hơn vào khung', { icon: '🔍' })
      } else {
        toast.success(`Phát hiện ${data.tong_so_hinh} hình`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Nhận diện thất bại')
    } finally {
      setBusy(false)
    }
  }

  // Upload: CNN 
  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn file ảnh')
    setPreview(URL.createObjectURL(file))
    setCaptured(null)
    setBusy(true)
    try {
      const res = await shapeApi.detectUpload(file, true)
      const data: DetectResult = res.data.data
      setCaptured(data)
      toast.success(`Phát hiện ${data.tong_so_hinh} hình`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Nhận diện thất bại')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setCaptured(null)
    setPreview(null)
  }

  // Khung nhận diện vẽ đè trực tiếp lên ảnh đã chụp (dùng tọa độ từ server)
  const capturedBoxes: OverlayBox[] = (captured?.shapes ?? []).map((s) => ({
    box: s.box,
    label: `${s.stt}. ${s.ten_hinh}`,
  }))

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white">Nhận diện Hình học</h2>
        <p className="text-sm text-gray-400 mt-1">
          {mode === 'webcam' ? (
            <>
              Webcam dùng <span className="text-brand-light font-medium">Vision AI</span> để
              chịu nhiễu tốt — nhấn "Chụp" khi đưa hình vào khung.
            </>
          ) : (
            <>Ảnh tải lên dùng <span className="text-brand-light font-medium">CNN tự train</span> — chính xác cao với ảnh sạch.</>
          )}
        </p>
      </motion.div>

      {/* Chọn chế độ */}
      <div className="flex gap-2">
        {([['webcam', 'Webcam (AI)', Camera], ['upload', 'Tải ảnh lên (CNN)', Upload]] as const).map(
          ([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === m ? 'bg-brand-teal text-white' : 'glass text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ),
        )}
      </div>

      <div className={mode === 'upload' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5' : 'max-w-2xl mx-auto'}>
        {/* Khung nhập ảnh */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            {mode === 'webcam' ? (
              <>
                <Radio size={15} className="text-brand-light" />
                Camera trực tiếp
                <span className="ml-auto text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Sparkles size={10} /> Vision AI
                </span>
              </>
            ) : (
              'Ảnh tải lên'
            )}
          </h3>

          {mode === 'webcam' ? (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={VIDEO_CONSTRAINTS}
                />
                {/* Hiệu ứng thanh quét phát quang — luôn chạy khi xem webcam */}
                <div className="scan-line-effect pointer-events-none" />
                {/* Khung corner cyber */}
                <div className="absolute inset-2 pointer-events-none">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-brand-light" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-brand-light" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-brand-light" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-brand-light" />
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-brand-light animate-pulse" />
                  <span className="text-[11px] text-white font-medium">LIVE</span>
                </div>
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="relative">
                      <Sparkles size={32} className="text-brand-light animate-pulse" />
                      <div className="absolute inset-0 animate-ping">
                        <Sparkles size={32} className="text-brand-light/30" />
                      </div>
                    </div>
                    <p className="text-sm text-white mt-3 font-medium">Đang phân tích bằng AI...</p>
                    <p className="text-[11px] text-gray-400 mt-1">Có thể mất 1-3 giây</p>
                  </div>
                )}
              </div>

              {/* Hướng dẫn */}
              <div className="mt-3 glass-light rounded-xl px-3 py-2.5 text-xs text-gray-400">
                <span className="text-brand-light font-medium">💡 Mẹo:</span>{' '}
                Đặt hình giữa khung, đảm bảo đủ sáng, sau đó nhấn "Chụp & phân tích".
              </div>

              <button
                type="button"
                onClick={capture}
                disabled={busy}
                className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
              >
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <Aperture size={15} />}
                {busy ? 'Đang phân tích...' : 'Chụp & phân tích bằng AI'}
              </button>
            </>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
              className="border-2 border-dashed border-white/15 rounded-xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-brand-teal/40 transition-all"
            >
              {preview ? (
                <img src={preview} alt="preview" className="max-h-full max-w-full object-contain rounded-lg" />
              ) : (
                <>
                  <ImageIcon size={36} className="text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">Nhấp hoặc kéo thả ảnh vào đây</p>
                  <p className="text-xs text-gray-600 mt-1">JPG, PNG — nền sáng, hình rõ nét</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                title="Chọn file ảnh để nhận diện"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}
        </motion.div>

        {/* Kết quả webcam (sau khi chụp) */}
        {mode === 'webcam' && captured && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-premium rounded-2xl p-5"
          >
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ScanLine size={15} className="text-brand-light" />
              Kết quả — phát hiện {captured.tong_so_hinh} hình
            </h3>
            {captured.image && (
              <div className="relative rounded-xl overflow-hidden">
                <img src={captured.image} alt="result" className="w-full" />
                {/* Overlay khung + nhãn tiếng Việt */}
                <CapturedOverlay boxes={capturedBoxes} imageUrl={captured.image} />
              </div>
            )}
          </motion.div>
        )}

        {/* Kết quả upload (sidebar bên phải) */}
        {mode === 'upload' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-premium rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Kết quả nhận diện</h3>
            {captured ? (
              <div className="space-y-3">
                {captured.image && (
                  <img src={captured.image} alt="result" className="w-full rounded-xl border border-white/10" />
                )}
                <div className="flex items-center justify-between glass-light rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-400">Tổng số hình phát hiện</span>
                  <span className="text-sm font-bold text-brand-light">{captured.tong_so_hinh}</span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-600">
                <ScanLine size={40} className="mb-2" />
                <p className="text-sm">Chưa có kết quả — hãy tải ảnh lên</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Danh sách hình chi tiết */}
      {captured && captured.shapes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Thông số chi tiết — {captured.shapes.length} hình (đã lưu lịch sử)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {captured.shapes.map((s) => <ShapeCard key={s.stt} shape={s} unit={unit} />)}
          </div>
        </motion.div>
      )}

      {captured && captured.shapes.length === 0 && (
        <div className="card-premium rounded-2xl p-6 text-center text-sm text-gray-400">
          Không phát hiện hình nào. Thử ảnh có hình rõ nét hơn.
        </div>
      )}
    </div>
  )
}

/**
 * Overlay nhãn tiếng Việt lên ảnh kết quả từ webcam (server chỉ vẽ số STT,
 * client render tên hình bằng canvas để hỗ trợ UTF-8 đầy đủ).
 */
function CapturedOverlay({ boxes, imageUrl }: { boxes: OverlayBox[]; imageUrl: string }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dims, setDims] = React.useState<{ w: number; h: number } | null>(null)

  React.useEffect(() => {
    const img = new Image()
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = imageUrl
  }, [imageUrl])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !dims) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = dims.w
    canvas.height = dims.h
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const COLORS = ['#2EAB7B', '#E87722', '#60A5FA', '#F59E0B', '#A78BFA']
    boxes.forEach((b, i) => {
      const color = COLORS[i % COLORS.length]
      const [x1, y1] = b.box
      ctx.font = '600 16px Inter, system-ui, sans-serif'
      const padX = 6
      const th = 24
      const tw = ctx.measureText(b.label).width + padX * 2
      ctx.fillStyle = color
      ctx.fillRect(x1, Math.max(0, y1 - th), tw, th)
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.label, x1 + padX, Math.max(th / 2, y1 - th / 2))
    })
  }, [boxes, dims])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
