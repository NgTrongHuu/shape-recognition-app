import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { APP_ROUTES } from '../../config/routes'

export default function Topbar() {
  const { user } = useAuth()
  const location = useLocation()
  const title = APP_ROUTES.find((r) => r.path === location.pathname)?.title || 'GeoVision'
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <header className="sticky top-0 z-20 glass border-b border-white/5 px-6 py-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white">{title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-teal to-brand-orange flex items-center justify-center text-[10px] font-bold text-white">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-white leading-none">{user?.name}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
