interface ProgressRingProps {
  percentage:    number
  titleColor:    string
  subtitleColor: string
  strokeColor?:  string
}

const CIRCUMFERENCE = 2 * Math.PI * 15

export default function ProgressRing({
  percentage,
  titleColor,
  subtitleColor,
  strokeColor = '#22c55e',
}: ProgressRingProps) {
  const offset = CIRCUMFERENCE * (1 - percentage)
  const label  = `${Math.round(percentage * 100)}%`
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        className="-rotate-90 w-full h-full"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={subtitleColor}
          strokeOpacity={0.3}
          strokeWidth="3"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[8px] font-bold leading-none"
        style={{ color: titleColor }}
      >
        {label}
      </span>
    </div>
  )
}
