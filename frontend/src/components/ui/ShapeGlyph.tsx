import React from 'react'

/** Vẽ biểu tượng SVG cho từng loại hình học. */
export default function ShapeGlyph({
  kind,
  size = 48,
  className = '',
}: {
  kind: string
  size?: number
  className?: string
}) {
  const stroke = 'currentColor'
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 6,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  }
  const poly = (pts: string) => <polygon points={pts} {...common} />

  let content: React.ReactNode
  switch (kind) {
    case 'tam_giac':
      content = poly('50,12 90,84 10,84')
      break
    case 'tam_giac_vuong':
      content = poly('16,12 16,84 88,84')
      break
    case 'vuong':
      content = <rect x="18" y="18" width="64" height="64" {...common} />
      break
    case 'chu_nhat':
      content = <rect x="10" y="28" width="80" height="44" {...common} />
      break
    case 'ngu_giac':
      content = poly('50,10 88,38 73,84 27,84 12,38')
      break
    case 'luc_giac':
      content = poly('50,10 86,30 86,70 50,90 14,70 14,30')
      break
    case 'da_giac':
    case 'da_giac_deu':
      content = poly('50,10 79,21 91,50 79,79 50,91 21,79 9,50 21,21')
      break
    case 'tron':
      content = <circle cx="50" cy="50" r="36" {...common} />
      break
    case 'hinh_thang':
      content = poly('28,24 72,24 90,80 10,80')
      break
    case 'binh_hanh':
      content = poly('30,26 92,26 70,78 8,78')
      break
    case 'thoi':
      content = poly('50,10 88,50 50,90 12,50')
      break
    default:
      content = <circle cx="50" cy="50" r="34" {...common} strokeDasharray="8 8" />
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  )
}
