import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, ScanLine, ScanEye, History as HistoryIcon,
  Calculator as CalcIcon, BookOpen, Settings as SettingsIcon,
} from 'lucide-react'

/** Một mục điều hướng của ứng dụng. */
export interface AppRoute {
  path: string
  label: string // nhãn ngắn — hiển thị ở Sidebar
  title: string // tiêu đề đầy đủ — hiển thị ở Topbar
  icon: LucideIcon
}

/**
 * Nguồn khai báo route DUY NHẤT của ứng dụng.
 * Sidebar và Topbar đều đọc từ đây — thêm trang mới chỉ cần sửa 1 chỗ.
 */
export const APP_ROUTES: AppRoute[] = [
  { path: '/',           label: 'Tổng quan',          title: 'Tổng quan',          icon: LayoutDashboard },
  { path: '/detect',     label: 'Nhận diện hình',     title: 'Nhận diện Hình học', icon: ScanLine },
  { path: '/objects',    label: 'Nhận diện vật thể',  title: 'Nhận diện Vật thể',  icon: ScanEye },
  { path: '/history',    label: 'Lịch sử',            title: 'Lịch sử Nhận diện',  icon: HistoryIcon },
  { path: '/calculator', label: 'Tính toán hình học', title: 'Tính toán Hình học', icon: CalcIcon },
  { path: '/library',    label: 'Thư viện hình học',  title: 'Thư viện Hình học',  icon: BookOpen },
  { path: '/settings',   label: 'Cài đặt',            title: 'Cài đặt',            icon: SettingsIcon },
]
