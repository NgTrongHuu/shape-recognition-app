import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { SlidersHorizontal, User, KeyRound, RotateCcw, Save } from 'lucide-react'
import { settingsApi, authApi } from '../services/api'
import { useAuth } from '../store/AuthContext'
import { Settings as SettingsType } from '../types'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [name, setName] = useState(user?.name || '')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')

  useEffect(() => {
    settingsApi.get().then((r) => setSettings(r.data.data)).catch(() => {})
  }, [])

  const change = (key: keyof SettingsType, value: any) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s))

  const saveSettings = async () => {
    if (!settings) return
    try {
      const res = await settingsApi.update(settings)
      setSettings(res.data.data)
      toast.success('Đã lưu cài đặt nhận diện')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Lưu thất bại')
    }
  }

  const resetSettings = async () => {
    try {
      const res = await settingsApi.reset()
      setSettings(res.data.data)
      toast.success('Đã khôi phục mặc định')
    } catch {
      toast.error('Khôi phục thất bại')
    }
  }

  const saveProfile = async () => {
    if (!name.trim()) return toast.error('Tên không được để trống')
    try {
      const res = await authApi.updateProfile(name.trim())
      updateUser(res.data.data)
      toast.success('Đã cập nhật hồ sơ')
    } catch {
      toast.error('Cập nhật thất bại')
    }
  }

  const changePassword = async () => {
    if (!oldPw || !newPw) return toast.error('Nhập đầy đủ mật khẩu')
    try {
      await authApi.changePassword(oldPw, newPw)
      setOldPw(''); setNewPw('')
      toast.success('Đổi mật khẩu thành công')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Đổi mật khẩu thất bại')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-white">Cài đặt</h2>
        <p className="text-sm text-gray-400 mt-1">Tùy chỉnh tham số nhận diện và tài khoản.</p>
      </motion.div>

      {/* Cài đặt nhận diện */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-premium rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-brand-light" /> Tham số nhận diện hình
        </h3>
        {settings ? (
          <div className="space-y-5">
            <Slider
              label="Diện tích tối thiểu" hint="Vùng nhỏ hơn ngưỡng này sẽ bị bỏ qua (lọc nhiễu)"
              min={50} max={5000} step={50} value={settings.min_area}
              suffix=" px²" onChange={(v) => change('min_area', v)}
            />
            <Slider
              label="Độ thô xấp xỉ đa giác" hint="Càng lớn càng ít đỉnh — giúp nhận hình rõ ràng hơn"
              min={0.01} max={0.12} step={0.01} value={settings.approx_epsilon}
              suffix="" onChange={(v) => change('approx_epsilon', v)}
            />
            <Slider
              label="Mức làm mờ khử nhiễu" hint="Kích thước bộ lọc Gaussian (số lẻ)"
              min={1} max={15} step={2} value={settings.blur_kernel}
              suffix=" px" onChange={(v) => change('blur_kernel', v)}
            />
            <Slider
              label="Ngưỡng độ tin cậy CNN" hint="Hình có độ tin cậy thấp hơn ngưỡng này sẽ bị bỏ qua"
              min={0.1} max={0.95} step={0.05} value={settings.min_confidence}
              suffix="" onChange={(v) => change('min_confidence', v)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit-select" className="block text-xs font-medium text-gray-400 mb-1.5">
                  Đơn vị hiển thị
                </label>
                <select
                  id="unit-select"
                  title="Đơn vị hiển thị kích thước"
                  value={settings.unit}
                  onChange={(e) => change('unit', e.target.value)}
                  className="input-field"
                >
                  <option value="px">px (điểm ảnh)</option>
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.draw_labels}
                    onChange={(e) => change('draw_labels', e.target.checked)}
                    className="w-4 h-4 accent-brand-teal"
                  />
                  <span className="text-sm text-gray-300">Vẽ tên hình lên ảnh kết quả</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={saveSettings} className="btn-primary flex items-center gap-2">
                <Save size={15} /> Lưu cài đặt
              </button>
              <button type="button" onClick={resetSettings} className="btn-ghost flex items-center gap-2">
                <RotateCcw size={15} /> Khôi phục mặc định
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Đang tải...</p>
        )}
      </motion.div>

      {/* Hồ sơ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-premium rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <User size={16} className="text-brand-light" /> Hồ sơ tài khoản
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="profile-email" className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
            <input
              id="profile-email"
              type="email"
              value={user?.email || ''}
              disabled
              placeholder="Email tài khoản"
              className="input-field opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-gray-400 mb-1.5">Tên hiển thị</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên hiển thị..."
              className="input-field"
            />
          </div>
          <button type="button" onClick={saveProfile} className="btn-primary flex items-center gap-2">
            <Save size={15} /> Cập nhật hồ sơ
          </button>
        </div>
      </motion.div>

      {/* Đổi mật khẩu */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-premium rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <KeyRound size={16} className="text-brand-light" /> Đổi mật khẩu
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="old-password" className="block text-xs font-medium text-gray-400 mb-1.5">Mật khẩu hiện tại</label>
            <input
              id="old-password"
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại..."
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-xs font-medium text-gray-400 mb-1.5">Mật khẩu mới</label>
            <input
              id="new-password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
              className="input-field"
            />
          </div>
          <button type="button" onClick={changePassword} className="btn-primary flex items-center gap-2">
            <KeyRound size={15} /> Đổi mật khẩu
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function Slider({
  label, hint, min, max, step, value, suffix, onChange,
}: {
  label: string; hint: string; min: number; max: number; step: number
  value: number; suffix: string; onChange: (v: number) => void
}) {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-xs font-medium text-gray-300">{label}</label>
        <span className="text-xs font-bold text-brand-light">{value}{suffix}</span>
      </div>
      <input
        id={id}
        type="range"
        title={label}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-teal"
      />
      <p className="text-[11px] text-gray-500 mt-0.5">{hint}</p>
    </div>
  )
}
