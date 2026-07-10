'use client'

// Tempo — the metronome coach. SVG ported verbatim from the v4 dashboard mockup
// (amber triangular body, swinging pendulum, face). The pendulum sway, its
// `transform-origin: 16px 30px` pivot, and the prefers-reduced-motion opt-out
// all live in globals.css under `.tempo-pendulum` (added in Step 5); until then
// the pendulum simply renders at rest.
//
// Positioning is the parent's job (HeroCard perches it top-right) — pass it via
// `className`. Phase 1: tapping is decorative / caller-defined; the Ask-Tempo
// sheet is Phase 4.

interface TempoCharacterProps {
  onClick?:   () => void
  className?: string
  size?:      number   // width in px; height scales to the 32×40 viewBox
}

export function TempoCharacter({ onClick, className = '', size = 44 }: TempoCharacterProps) {
  const height = (size * 40) / 32

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ask Tempo"
      className={`border-none bg-transparent p-0 cursor-pointer rounded-[10px] focus-visible:outline-2 focus-visible:outline-amber-700 ${className}`}
    >
      <svg width={size} height={height} viewBox="0 0 32 40" className="overflow-visible">
        {/* body */}
        <path
          d="M13 3 Q16 1.5 19 3 L26.5 31 L5.5 31 Z"
          fill="#B45309"
          stroke="#92400e"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* base */}
        <rect x="3.5" y="30" width="25" height="6" rx="2" fill="#78350f" />
        {/* pendulum slot */}
        <rect x="15.1" y="7" width="1.8" height="22" rx="0.9" fill="rgba(60,25,5,.45)" />
        {/* pendulum arm + weight (animated in globals.css) */}
        <line
          className="tempo-pendulum"
          x1="16"
          y1="30"
          x2="16"
          y2="8.5"
          stroke="#fde68a"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          className="tempo-pendulum"
          x="13.4"
          y="11"
          width="5.2"
          height="4"
          rx="1.2"
          fill="#fde68a"
        />
        {/* face */}
        <circle cx="11" cy="22.5" r="1.6" fill="#1e293b" />
        <circle cx="21" cy="22.5" r="1.6" fill="#1e293b" />
        <path
          d="M11.5 26 Q16 29 20.5 26"
          stroke="#1e293b"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}
