import React, { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Calculator as CalcIcon, Sparkles } from 'lucide-react'
import { shapeApi } from '../services/api'
import ShapeGlyph from '../components/ui/ShapeGlyph'

interface Field { key: string; label: string }
interface ShapeDef { id: string; glyph: string; name: string; fields: Field[]; formula: string }

const SHAPES: ShapeDef[] = [
  { id: 'vuong', glyph: 'vuong', name: 'Hình vuông', formula: 'S = a²  ·  P = 4a',
    fields: [{ key: 'canh', label: 'Cạnh a' }] },
  { id: 'chu_nhat', glyph: 'chu_nhat', name: 'Hình chữ nhật', formula: 'S = a × b  ·  P = 2(a + b)',
    fields: [{ key: 'chieu_dai', label: 'Chiều dài a' }, { key: 'chieu_rong', label: 'Chiều rộng b' }] },
  { id: 'tron', glyph: 'tron', name: 'Hình tròn', formula: 'S = πr²  ·  C = 2πr',
    fields: [{ key: 'ban_kinh', label: 'Bán kính r' }] },
  { id: 'tam_giac', glyph: 'tam_giac', name: 'Tam giác (3 cạnh)', formula: 'Công thức Heron: S = √[s(s−a)(s−b)(s−c)]',
    fields: [{ key: 'canh_a', label: 'Cạnh a' }, { key: 'canh_b', label: 'Cạnh b' }, { key: 'canh_c', label: 'Cạnh c' }] },
  { id: 'tam_giac_vuong', glyph: 'tam_giac_vuong', name: 'Tam giác vuông', formula: 'S = (a×b)/2  ·  c = √(a² + b²)',
    fields: [{ key: 'canh_goc_vuong_1', label: 'Cạnh góc vuông a' }, { key: 'canh_goc_vuong_2', label: 'Cạnh góc vuông b' }] },
  { id: 'hinh_thang', glyph: 'hinh_thang', name: 'Hình thang', formula: 'S = (a + b) × h / 2',
    fields: [{ key: 'day_lon', label: 'Đáy lớn a' }, { key: 'day_nho', label: 'Đáy nhỏ b' }, { key: 'chieu_cao', label: 'Chiều cao h' }] },
  { id: 'binh_hanh', glyph: 'binh_hanh', name: 'Hình bình hành', formula: 'S = a × h  ·  P = 2(a + b)',
    fields: [{ key: 'canh_day', label: 'Cạnh đáy a' }, { key: 'canh_ben', label: 'Cạnh bên b' }, { key: 'chieu_cao', label: 'Chiều cao h' }] },
  { id: 'thoi', glyph: 'thoi', name: 'Hình thoi', formula: 'S = (d₁ × d₂) / 2',
    fields: [{ key: 'duong_cheo_1', label: 'Đường chéo d₁' }, { key: 'duong_cheo_2', label: 'Đường chéo d₂' }] },
  { id: 'da_giac_deu', glyph: 'da_giac_deu', name: 'Đa giác đều', formula: 'Tổng góc trong = (n − 2) × 180°',
    fields: [{ key: 'so_canh', label: 'Số cạnh n' }, { key: 'do_dai_canh', label: 'Độ dài cạnh' }] },
]

const RESULT_LABELS: Record<string, string> = {
  dien_tich: 'Diện tích',
  chu_vi: 'Chu vi',
  duong_cheo: 'Đường chéo',
  duong_kinh: 'Đường kính',
  canh_huyen: 'Cạnh huyền',
  canh: 'Độ dài cạnh',
  chieu_cao_canh_a: 'Chiều cao (ứng cạnh a)',
  duong_trung_binh: 'Đường trung bình',
  tong_goc_trong: 'Tổng góc trong',
  moi_goc: 'Mỗi góc',
  goc: 'Các góc',
}

export default function Calculator() {
  const [shape, setShape] = useState<ShapeDef>(SHAPES[0])
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Record<string, any> | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = (s: ShapeDef) => {
    setShape(s)
    setValues({})
    setResult(null)
  }

  const compute = async () => {
    const params: Record<string, number> = {}
    for (const f of shape.fields) {
      const raw = values[f.key]
      if (raw === undefined || raw === '') return toast.error(`Nhập ${f.label}`)
      const n = Number(raw)
      if (isNaN(n) || n <= 0) return toast.error(`${f.label} phải là số dương`)
      params[f.key] = n
    }
    setBusy(true)
    try {
      const res = await shapeApi.calculate(shape.id, params)
      setResult(res.data.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Tính toán thất bại')
    } finally {
      setBusy(false)
    }
  }

  const fmt = (key: string, val: any) => {
    if (Array.isArray(val)) return val.map((v) => `${v}°`).join('  ·  ')
    if (key === 'dien_tich') return `${val} đơn vị²`
    if (key === 'tong_goc_trong' || key === 'moi_goc') return `${val}°`
    return `${val} đơn vị`
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white">Tính toán Hình học</h2>
        <p className="text-sm text-gray-400 mt-1">
          Chọn loại hình, nhập kích thước — hệ thống tính diện tích, chu vi, góc và các thông số.
        </p>
      </motion.div>

      {/* Chọn hình */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
        {SHAPES.map((s) => (
          <button
            key={s.id}
            onClick={() => pick(s)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
              shape.id === s.id
                ? 'bg-brand-teal/15 border border-brand-teal/40 text-brand-light'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            <ShapeGlyph kind={s.glyph} size={34} />
            <span className="text-[10px] text-center leading-tight">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Nhập liệu */}
        <motion.div key={shape.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card-premium rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-light">
              <ShapeGlyph kind={shape.glyph} size={34} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{shape.name}</h3>
              <p className="text-xs text-gray-500">{shape.formula}</p>
            </div>
          </div>

          <div className="space-y-3">
            {shape.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder="Nhập giá trị..."
                  className="input-field"
                />
              </div>
            ))}
          </div>

          <button onClick={compute} disabled={busy} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
            <CalcIcon size={15} /> {busy ? 'Đang tính...' : 'Tính toán'}
          </button>
        </motion.div>

        {/* Kết quả */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles size={15} className="text-brand-light" /> Kết quả
          </h3>
          {result ? (
            <div className="space-y-2">
              {Object.entries(result).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between glass-light rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-300">{RESULT_LABELS[k] || k}</span>
                  <span className="text-sm font-bold text-brand-light">{fmt(k, v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-600">
              <CalcIcon size={38} className="mb-2" />
              <p className="text-sm">Nhập kích thước và bấm "Tính toán"</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
