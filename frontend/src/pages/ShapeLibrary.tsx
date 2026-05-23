import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Search } from 'lucide-react'
import ShapeGlyph from '../components/ui/ShapeGlyph'

interface Entry {
  glyph: string
  name: string
  desc: string
  props: string[]
  area: string
  perimeter: string
}

const LIBRARY: Entry[] = [
  {
    glyph: 'tam_giac', name: 'Tam giác',
    desc: 'Đa giác có 3 cạnh và 3 góc. Tổng ba góc trong luôn bằng 180°.',
    props: ['3 cạnh, 3 đỉnh, 3 góc', 'Tổng góc trong = 180°', 'Phân loại: đều, cân, vuông, thường'],
    area: 'S = (đáy × chiều cao) / 2  hoặc Heron', perimeter: 'P = a + b + c',
  },
  {
    glyph: 'tam_giac_vuong', name: 'Tam giác vuông',
    desc: 'Tam giác có một góc bằng 90°. Cạnh đối diện góc vuông gọi là cạnh huyền.',
    props: ['Có 1 góc 90°', 'Định lý Pythagore: c² = a² + b²', 'Cạnh huyền là cạnh dài nhất'],
    area: 'S = (a × b) / 2', perimeter: 'P = a + b + c',
  },
  {
    glyph: 'vuong', name: 'Hình vuông',
    desc: 'Tứ giác đều có 4 cạnh bằng nhau và 4 góc vuông.',
    props: ['4 cạnh bằng nhau', '4 góc vuông (90°)', 'Hai đường chéo bằng nhau, vuông góc'],
    area: 'S = a²', perimeter: 'P = 4a',
  },
  {
    glyph: 'chu_nhat', name: 'Hình chữ nhật',
    desc: 'Tứ giác có 4 góc vuông; các cạnh đối song song và bằng nhau.',
    props: ['4 góc vuông', 'Cạnh đối bằng nhau', 'Hai đường chéo bằng nhau'],
    area: 'S = a × b', perimeter: 'P = 2(a + b)',
  },
  {
    glyph: 'binh_hanh', name: 'Hình bình hành',
    desc: 'Tứ giác có các cạnh đối song song và bằng nhau.',
    props: ['Cạnh đối song song & bằng nhau', 'Góc đối bằng nhau', 'Đường chéo cắt nhau tại trung điểm'],
    area: 'S = đáy × chiều cao', perimeter: 'P = 2(a + b)',
  },
  {
    glyph: 'thoi', name: 'Hình thoi',
    desc: 'Tứ giác có 4 cạnh bằng nhau; hai đường chéo vuông góc.',
    props: ['4 cạnh bằng nhau', 'Đường chéo vuông góc', 'Đường chéo là phân giác các góc'],
    area: 'S = (d₁ × d₂) / 2', perimeter: 'P = 4a',
  },
  {
    glyph: 'hinh_thang', name: 'Hình thang',
    desc: 'Tứ giác có ít nhất một cặp cạnh đối song song (gọi là hai đáy).',
    props: ['1 cặp cạnh song song', 'Hai cạnh song song là đáy lớn & đáy nhỏ', 'Thang cân: hai cạnh bên bằng nhau'],
    area: 'S = (a + b) × h / 2', perimeter: 'P = tổng 4 cạnh',
  },
  {
    glyph: 'ngu_giac', name: 'Ngũ giác',
    desc: 'Đa giác có 5 cạnh và 5 góc. Ngũ giác đều có các cạnh và góc bằng nhau.',
    props: ['5 cạnh, 5 đỉnh', 'Tổng góc trong = 540°', 'Ngũ giác đều: mỗi góc 108°'],
    area: 'S = (5 × a²) / (4·tan36°)', perimeter: 'P = 5a',
  },
  {
    glyph: 'luc_giac', name: 'Lục giác',
    desc: 'Đa giác có 6 cạnh và 6 góc. Lục giác đều xuất hiện nhiều trong tự nhiên (tổ ong).',
    props: ['6 cạnh, 6 đỉnh', 'Tổng góc trong = 720°', 'Lục giác đều: mỗi góc 120°'],
    area: 'S = (3√3 / 2) × a²', perimeter: 'P = 6a',
  },
  {
    glyph: 'tron', name: 'Hình tròn',
    desc: 'Tập hợp các điểm cách đều một điểm cố định (tâm) một khoảng bằng bán kính.',
    props: ['Không có cạnh, không có đỉnh', 'Bán kính r, đường kính d = 2r', 'Số π ≈ 3,14159'],
    area: 'S = π × r²', perimeter: 'C = 2 × π × r',
  },
]

export default function ShapeLibrary() {
  const [query, setQuery] = useState('')
  const filtered = LIBRARY.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-brand-light" /> Thư viện Hình học
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Tra cứu định nghĩa, tính chất và công thức của các hình học cơ bản.
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm hình..."
            className="bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 rounded-xl pl-9 pr-3 py-2 w-48 focus:outline-none focus:border-brand-teal/50"
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((e, i) => (
          <motion.div
            key={e.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.4) }}
            className="card-premium rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-light flex-shrink-0">
                <ShapeGlyph kind={e.glyph} size={40} />
              </div>
              <h3 className="text-base font-bold text-white">{e.name}</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">{e.desc}</p>

            <div className="mt-3">
              <p className="text-[11px] font-semibold text-brand-light mb-1">Dấu hiệu nhận biết</p>
              <ul className="space-y-1">
                {e.props.map((p) => (
                  <li key={p} className="text-xs text-gray-300 flex gap-1.5">
                    <span className="text-brand-light">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Diện tích</span>
                <span className="text-white font-medium text-right">{e.area}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Chu vi</span>
                <span className="text-white font-medium text-right">{e.perimeter}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card-premium rounded-2xl py-16 text-center text-gray-500 text-sm">
          Không tìm thấy hình phù hợp
        </div>
      )}
    </div>
  )
}
