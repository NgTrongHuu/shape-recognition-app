import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Camera, Upload, Trash2, Search, X, ClipboardList, AlertTriangle,
} from 'lucide-react'
import { historyApi, settingsApi } from '../services/api'
import { HistoryRecord } from '../types'
import ShapeCard from '../components/ui/ShapeCard'

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<HistoryRecord | null>(null)
  const [unit, setUnit] = useState('px')

  const load = () => {
    setLoading(true)
    historyApi.list()
      .then((r) => setRecords(r.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    settingsApi.get().then((r) => setUnit(r.data.data.unit || 'px')).catch(() => {})
  }, [])

  const remove = async (id: string) => {
    try {
      await historyApi.remove(id)
      setRecords((rs) => rs.filter((r) => r.id !== id))
      if (active?.id === id) setActive(null)
      toast.success('Đã xóa bản ghi')
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const clearAll = async () => {
    if (!confirm('Xóa toàn bộ lịch sử nhận diện? Hành động không thể hoàn tác.')) return
    try {
      await historyApi.clear()
      setRecords([])
      toast.success('Đã xóa toàn bộ lịch sử')
    } catch {
      toast.error('Xóa thất bại')
    }
  }

  const filtered = records.filter((r) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return Object.keys(r.tom_tat).some((k) => k.toLowerCase().includes(q))
  })

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Lịch sử Nhận diện</h2>
          <p className="text-sm text-gray-400 mt-1">{records.length} lượt nhận diện đã lưu</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo loại hình..."
              className="bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 rounded-xl pl-9 pr-3 py-2 w-52 focus:outline-none focus:border-brand-teal/50"
            />
          </div>
          {records.length > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all">
              <Trash2 size={15} /> Xóa tất cả
            </button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 bg-white/5 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-premium rounded-2xl py-16 flex flex-col items-center text-gray-500">
          <ClipboardList size={42} className="mb-3" />
          <p className="text-sm">{records.length === 0 ? 'Chưa có lịch sử nhận diện' : 'Không có kết quả phù hợp'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="card-premium rounded-2xl overflow-hidden group"
            >
              <div className="relative cursor-pointer" onClick={() => setActive(r)}>
                <img src={r.image_url} alt="" className="w-full h-40 object-cover" />
                <span className="absolute top-2 right-2 text-[11px] bg-brand-teal/90 text-white px-2 py-0.5 rounded-full">
                  {r.tong_so_hinh} hình
                </span>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    {r.source === 'webcam' ? <Camera size={12} /> : <Upload size={12} />}
                    {new Date(r.timestamp).toLocaleString('vi-VN')}
                  </div>
                  <button onClick={() => remove(r.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(r.tom_tat).map(([name, n]) => (
                    <span key={name} className="text-[11px] bg-white/5 text-brand-light px-2 py-0.5 rounded-md">
                      {name} ×{n}
                    </span>
                  ))}
                  {Object.keys(r.tom_tat).length === 0 && (
                    <span className="text-[11px] text-gray-600">Không có hình</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal chi tiết */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-dark border border-white/10 rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-brand-dark/95 backdrop-blur flex items-center justify-between px-5 py-3.5 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">Chi tiết nhận diện</h3>
                  <p className="text-xs text-gray-500">{new Date(active.timestamp).toLocaleString('vi-VN')}</p>
                </div>
                <button onClick={() => setActive(null)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <img src={active.image_url} alt="" className="w-full rounded-xl border border-white/10" />
                {active.shapes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {active.shapes.map((s) => <ShapeCard key={s.stt} shape={s} unit={unit} />)}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <AlertTriangle size={15} /> Không phát hiện hình nào trong ảnh này.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
