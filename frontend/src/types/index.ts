export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export interface ShapeProps {
  dien_tich: number
  chu_vi: number
  chieu_rong: number
  chieu_cao: number
  so_dinh: number
  do_tron: number
  toa_do_tam: { x: number; y: number }
}

export interface ShapeDetail {
  canh?: number[]
  goc?: number[]
  tong_goc?: number
  phan_loai?: string
  chieu_dai?: number
  chieu_rong?: number
  duong_cheo?: number
  ban_kinh?: number
  duong_kinh?: number
}

export interface Shape {
  stt: number
  loai: string
  ten_hinh: string
  do_tin_cay: number
  so_dinh: number
  box: [number, number, number, number]
  thong_so: ShapeProps
  chi_tiet: ShapeDetail
}

export interface DetectResult {
  image: string | null
  shapes: Shape[]
  tong_so_hinh: number
}

export interface DetectedObject {
  stt: number
  label: string
  ten: string
  do_tin_cay: number
  box: [number, number, number, number]
}

export interface ObjectDetectResult {
  image: string | null
  objects: DetectedObject[]
  tong_so: number
}

export interface HistoryRecord {
  id: string
  timestamp: string
  source: string
  image_url: string
  tong_so_hinh: number
  shapes: Shape[]
  tom_tat: Record<string, number>
}

export interface Stats {
  total_detections: number
  total_shapes: number
  avg_shapes: number
  most_common: string
  by_type: { name: string; value: number }[]
  by_source: { name: string; value: number }[]
  recent: { id: string; timestamp: string; source: string; tong_so_hinh: number; image_url: string }[]
  by_day: { day: string; count: number }[]
}

export interface Settings {
  min_area: number
  approx_epsilon: number
  blur_kernel: number
  unit: string
  draw_labels: boolean
  min_confidence: number
}
