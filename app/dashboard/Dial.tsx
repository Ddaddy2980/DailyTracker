'use client'

type Props = {
  pct:     number
  color:   string   // stroke color (hex)
  size?:   number   // diameter in px, default 64
}

export default function Dial({ pct, color, size = 64 }: Props) {
  const cx      = size / 2
  const cy      = size / 2
  const radius  = (size - 10) / 2          // leave 5px padding each side for stroke
  const circ    = 2 * Math.PI * radius
  const dash    = Math.min(pct / 100, 1) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="5"
        />
        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      {/* Percentage label */}
      <div
        className="absolute inset-0 flex items-center justify-center text-center"
        style={{ fontSize: size < 56 ? 9 : 11, fontWeight: 900, color }}
      >
        {pct}%
      </div>
    </div>
  )
}
