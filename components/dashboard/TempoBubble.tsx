'use client'

import { useEffect, useRef, useState } from 'react'
import { TEMPO_BUBBLE_DURATION_MS } from '@/lib/tempo'

// Tempo's speech bubble. Self-dismissing: whenever `line` becomes a non-null
// value it shows, then fades out after `durationMs` and calls `onDismiss` so the
// parent can clear its state back to null (which lets the same line re-show
// later). Styling ported from the v4 mockup (dark slate, tail toward Tempo).

interface TempoBubbleProps {
  line:        string | null
  durationMs?: number
  onDismiss?:  () => void
  className?:  string
}

export function TempoBubble({
  line,
  durationMs = TEMPO_BUBBLE_DURATION_MS,
  onDismiss,
  className = '',
}: TempoBubbleProps) {
  const [visible, setVisible] = useState(false)
  const [text, setText]       = useState('')

  // Ref so an unstable onDismiss identity doesn't restart the dismiss timer.
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!line) {
      setVisible(false)
      return
    }
    setText(line)   // hold the text through the fade-out even after `line` nulls
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onDismissRef.current?.()
    }, durationMs)
    return () => clearTimeout(timer)
  }, [line, durationMs])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute top-16 right-2 max-w-[250px] bg-slate-800 text-slate-100 text-[12.5px] leading-[1.45] px-3 py-2.5 rounded-[14px_4px_14px_14px] shadow-[0_8px_24px_rgba(15,23,42,0.3)] z-30 pointer-events-none transition-[opacity,transform] duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1.5'
      } ${className}`}
    >
      {text}
    </div>
  )
}
