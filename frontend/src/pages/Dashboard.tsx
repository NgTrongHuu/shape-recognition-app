import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { ScanLine, Shapes, Layers, Star, ArrowRight, Camera, Upload } from 'lucide-react'
import { statsApi } from '../services/api'
import { useAuth } from '../store/AuthContext'
import { Stats } from '../types'
import ObjectDetectorCard from '../components/ui/ObjectDetectorCard'

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
}
const COLORS = ['#2aab7b', '#e87722', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6', '#34d399']

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.get()
      .then((r) => setStats(r.data.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardSkeleton />

  const cards = stats
    ? [
        { label: 'Lượt nhận diện', value: stats.total_detections, icon: ScanLine, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Tổng số hình', value: stats.total_shapes, icon: Shapes, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'TB hình / lượt', value: stats.avg_shapes, icon: Layers, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Hình phổ biến', value: stats.most_common, icon: Star, color: 'text-brand-light', bg: 'bg-brand-teal/10' },
      ]
    : []

  const hasData = stats && stats.total_detections > 0

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white">
          Chào mừng, <span className="text-gradient">{user?.name}</span> 👋
        </h2>
        <p className="text-sm text-gray-400 mt-1">Tổng quan hoạt động nhận diện hình học</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} custom={i} variants={FADE_UP} initial="hidden" animate="show" className="card-premium rounded-2xl p-4">
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon size={18} className={c.color} />
            </div>
            <p className="text-2xl font-bold text-white truncate">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Hành động nhanh */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card-premium rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Bắt đầu nhận diện</h3>
          <p className="text-xs text-gray-400 mt-1">Dùng webcam hoặc tải ảnh lên để phát hiện hình học.</p>
        </div>
        <button type="button" onClick={() => navigate('/detect')} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <Camera size={15} /> Mở trang Nhận diện <ArrowRight size={15} />
        </button>
      </motion.div>

      {/* Nhận diện vật thể realtime (YOLOv8) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <ObjectDetectorCard />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="card-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Phân bố loại hình</h3>
          {hasData && stats!.by_type.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats!.by_type} cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} dataKey="value">
                    {stats!.by_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d2b1e', border: '1px solid rgba(42,171,123,0.2)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {stats!.by_type.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-400">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart text="Chưa có dữ liệu nhận diện" />
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="card-premium rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Hoạt động gần đây</h3>
          {hasData && stats!.by_day.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats!.by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0d2b1e', border: '1px solid rgba(42,171,123,0.2)', borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: 'rgba(42,171,123,0.08)' }} />
                <Bar dataKey="count" fill="#2aab7b" radius={[6, 6, 0, 0]} name="Lượt" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="Chưa có hoạt động" />
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-premium rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Nhận diện gần đây</h3>
        {hasData && stats!.recent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats!.recent.map((r) => (
              <div
                key={r.id}
                onClick={() => navigate('/history')}
                className="glass-light rounded-xl overflow-hidden hover:border-brand-teal/30 transition-all cursor-pointer"
              >
                <img src={r.image_url} alt="" className="w-full h-32 object-cover" />
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    {r.source === 'webcam' ? <Camera size={12} /> : <Upload size={12} />}
                    {new Date(r.timestamp).toLocaleString('vi-VN')}
                  </div>
                  <span className="text-xs font-semibold text-brand-light">{r.tong_so_hinh} hình</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-6">Chưa có lượt nhận diện nào</p>
        )}
      </motion.div>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="h-48 flex items-center justify-center text-gray-500 text-sm">{text}</div>
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-white/5 rounded-xl w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div className="h-64 bg-white/5 rounded-2xl" />
        <div className="h-64 bg-white/5 rounded-2xl" />
      </div>
    </div>
  )
}
