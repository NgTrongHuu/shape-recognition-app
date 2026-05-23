import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shapes, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuth } from '../store/AuthContext'
import ShapeGlyph from '../components/ui/ShapeGlyph'

const DEMO_SHAPES = ['tam_giac', 'vuong', 'tron', 'luc_giac', 'ngu_giac', 'thoi']

export default function Login() {
  const [email, setEmail] = useState('admin@geovision.app')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Vui lòng nhập đầy đủ thông tin')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      const { access_token, user } = res.data.data
      login(access_token, user)
      toast.success(`Chào mừng, ${user.name}!`)
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#030f08]">
      <div className="absolute inset-0 bg-mesh-green opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative min-h-screen flex">
        {/* Panel trái – trưng bày hình học */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="relative w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-8"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-teal to-brand-green flex items-center justify-center mb-4 glow-green">
                <Shapes size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white leading-snug">GeoVision</h2>
              <p className="text-brand-light font-medium mt-1">Nhận diện & Phân tích Hình học</p>
              <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                Phát hiện hình học bằng thị giác máy tính, tính toán diện tích – chu vi – góc
                tự động, chính xác và trực quan.
              </p>
              <div className="w-10 h-0.5 bg-gradient-to-r from-brand-teal to-brand-orange mt-4 rounded-full" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="grid grid-cols-3 gap-4"
            >
              {DEMO_SHAPES.map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="card-premium rounded-2xl aspect-square flex items-center justify-center text-brand-light"
                >
                  <ShapeGlyph kind={s} size={56} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Panel phải – form đăng nhập */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-md mx-8"
          >
            <div className="lg:hidden text-center mb-8">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-teal to-brand-green flex items-center justify-center mb-3 glow-green">
                <Shapes size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">GeoVision</h1>
              <p className="text-sm text-gray-400 mt-1">Nhận diện Hình học</p>
            </div>

            <div className="card-premium rounded-2xl p-8">
              <div className="mb-7">
                <h1 className="text-xl font-bold text-white">Đăng nhập</h1>
                <p className="text-sm text-gray-400 mt-1">Chào mừng trở lại!</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal/30 transition-all">
                    <Mail size={15} className="ml-3 shrink-0 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@geovision.app"
                      className="flex-1 bg-transparent text-white placeholder-gray-500 px-3 py-3 focus:outline-none text-sm min-w-0"
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Mật khẩu</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-brand-teal focus-within:ring-1 focus-within:ring-brand-teal/30 transition-all">
                    <Lock size={15} className="ml-3 shrink-0 text-gray-500" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className="flex-1 bg-transparent text-white placeholder-gray-500 px-3 py-3 focus:outline-none text-sm min-w-0"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="mr-3 shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Đăng nhập <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-gray-500 bg-white/5 rounded-xl py-2.5 px-3">
                Tài khoản mặc định: <span className="text-brand-light">admin@geovision.app</span>
                {' '}/ mật khẩu <span className="text-brand-light">secret</span>
              </div>
            </div>

            <p className="text-center text-[11px] text-gray-600 mt-4">
              © 2026 GeoVision – Hệ thống Nhận diện Hình học.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
