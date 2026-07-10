'use client'

import { useRef, useState } from 'react'

// One duration goal, as a press-and-hold ring — "the habit IS the button."
// Holding for `holdMs` fills the ring and fires `onHold` (commit-only: a done
// ring can't be un-held). Enter/Space commit instantly for keyboard/a11y.
//
// This component is gesture + presentation only. The parent (DashboardShell)
// owns the optimistic `done` state and rolls it back on a failed commit; here
// `done` and `disabled` (in-flight) come in as props.

interface GoalRingProps {
  label:      string
  icon:       string
  labelColor: string          // pillar title color
  done:       boolean         // committed / optimistic
  disabled?:  boolean         // commit in flight — no re-trigger
  onHold:     () => void
  holdMs?:    number
  ariaLabel?: string
  widthClass?: string         // grid sizing owned by the parent (e.g. "w-[44%]")
}

const RADIUS = 29
const RING_C = 2 * Math.PI * RADIUS   // ≈ 182.2

export function GoalRing({
  label,
  icon,
  labelColor,
  done,
  disabled = false,
  onHold,
  holdMs = 450,
  ariaLabel,
  widthClass = 'w-24',
}: GoalRingProps) {
  const [filling, setFilling] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const locked = done || disabled

  function commit() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25)
    setFilling(false)
    onHold()
  }

  function startHold(e: React.PointerEvent) {
    if (locked) return
    e.preventDefault()
    setFilling(true)
    timerRef.current = setTimeout(commit, holdMs)
  }

  function cancelHold() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setFilling(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (locked) return
      commit()
    }
  }

  const fillClass = done ? 'is-done' : filling ? 'is-filling' : ''

  return (
    <button
      type="button"
      className={`group flex ${widthClass} flex-col items-center gap-1.5 border-none bg-transparent p-0.5 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default`}
      disabled={disabled}
      aria-disabled={locked}
      aria-label={ariaLabel ?? (done ? `${label} — completed` : `Press and hold to complete: ${label}`)}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={onKeyDown}
    >
      <span
        className={`relative h-16 w-16 touch-none select-none transition-transform duration-150 ${
          locked ? '' : 'group-active:scale-[0.97]'
        }`}
      >
        <svg width="64" height="64" className="absolute inset-0 -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="4"
            strokeDasharray="3 5"
          />
        </svg>
        <svg width="64" height="64" className="absolute inset-0 -rotate-90">
          <circle
            className={`goal-fill ${fillClass}`}
            cx="32"
            cy="32"
            r={RADIUS}
            fill="none"
            stroke="#22c55e"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C}
          />
        </svg>
        <span
          className={`absolute inset-1.5 flex items-center justify-center rounded-full text-[22px] transition-[background-color,transform] duration-300 ${
            done ? 'scale-[1.04] bg-[#22c55e]' : 'bg-white/10'
          }`}
        >
          <span className={done ? '[filter:brightness(10)_saturate(0)]' : ''}>{icon}</span>
        </span>
      </span>
      <span
        className={`text-center text-[10.5px] font-semibold uppercase leading-[1.25] tracking-[0.03em] ${
          done ? 'opacity-90' : ''
        }`}
        style={{ color: labelColor }}
      >
        {label}
      </span>
    </button>
  )
}
