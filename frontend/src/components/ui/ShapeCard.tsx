import React from 'react'
import { Shape } from '../../types'
import ShapeGlyph from './ShapeGlyph'

/** Thẻ hiển thị 1 hình đã nhận diện kèm thông số & chi tiết hình học. */
export default function ShapeCard({ shape, unit = 'px' }: { shape: Shape; unit?: string }) {
  const p = shape.thong_so
  const d = shape.chi_tiet

  const rows: { label: string; value: string }[] = [
    { label: 'Diện tích', value: `${p.dien_tich} ${unit}²` },
    { label: 'Chu vi', value: `${p.chu_vi} ${unit}` },
    { label: 'Số đỉnh', value: `${p.so_dinh}` },
    { label: 'Độ tròn', value: `${p.do_tron}` },
    { label: 'Độ tin cậy', value: `${(shape.do_tin_cay * 100).toFixed(1)}%` },
  ]
  if (d.ban_kinh) rows.push({ label: 'Bán kính', value: `${d.ban_kinh} ${unit}` })
  if (d.duong_kinh) rows.push({ label: 'Đường kính', value: `${d.duong_kinh} ${unit}` })
  if (d.chieu_dai) rows.push({ label: 'Chiều dài', value: `${d.chieu_dai} ${unit}` })
  if (d.chieu_rong) rows.push({ label: 'Chiều rộng', value: `${d.chieu_rong} ${unit}` })
  if (d.duong_cheo) rows.push({ label: 'Đường chéo', value: `${d.duong_cheo} ${unit}` })

  return (
    <div className="glass-light rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-light flex-shrink-0">
          <ShapeGlyph kind={shape.loai} size={32} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            #{shape.stt} · {shape.ten_hinh}
          </p>
          {d.phan_loai && <p className="text-xs text-brand-light">{d.phan_loai}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-xs">
            <span className="text-gray-400">{r.label}</span>
            <span className="text-white font-medium">{r.value}</span>
          </div>
        ))}
      </div>

      {d.canh && d.canh.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[11px] text-gray-400 mb-1">Độ dài các cạnh ({unit})</p>
          <div className="flex flex-wrap gap-1.5">
            {d.canh.map((c, i) => (
              <span key={i} className="text-[11px] bg-white/5 text-white px-2 py-0.5 rounded-md">{c}</span>
            ))}
          </div>
        </div>
      )}

      {d.goc && d.goc.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-gray-400 mb-1">Các góc (°)</p>
          <div className="flex flex-wrap gap-1.5">
            {d.goc.map((g, i) => (
              <span key={i} className="text-[11px] bg-white/5 text-white px-2 py-0.5 rounded-md">{g}°</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
