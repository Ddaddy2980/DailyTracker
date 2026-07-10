'use client'

import { HeroRing, type HeroRingSegment } from './HeroRing'
import { TempoCharacter } from './TempoCharacter'
import { TempoBubble } from './TempoBubble'

// The hero: segmented today-ring + greeting + streak line, with Tempo perched
// top-right and a self-dismissing speech bubble. Sticky at the top of the
// dashboard scroll. Ported from the v4 mockup .hero.

interface HeroCardProps {
  name:            string | null
  segments:        HeroRingSegment[]
  greeting:        string
  mainStreak:      number
  graceBank:       number
  sealed:          boolean
  dayLabel?:       string          // e.g. "Day 23" — shown in the sealed chip
  showStreak?:     boolean         // false on past-day views (hero hides the streak line)
  tempoLine:       string | null
  onTempoDismiss?: () => void
  onTempoClick?:   () => void
}

export function HeroCard({
  name,
  segments,
  greeting,
  mainStreak,
  graceBank,
  sealed,
  dayLabel,
  showStreak = true,
  tempoLine,
  onTempoDismiss,
  onTempoClick,
}: HeroCardProps) {
  return (
    <div className="relative sticky top-0 z-20 mt-3.5 flex items-center gap-3.5 rounded-[20px] p-4 bg-[rgba(255,255,255,0.92)] backdrop-blur-[10px] shadow-[0_4px_16px_rgba(15,23,42,0.12)]">
      <TempoCharacter onClick={onTempoClick} className="absolute top-2 right-2.5 z-[5]" />
      <TempoBubble line={tempoLine} onDismiss={onTempoDismiss} />

      <HeroRing segments={segments} />

      <div className="flex-1 min-w-0">
        <h2 className="m-0 text-[17px] text-slate-800">
          {name ? `Hi ${name}!` : 'Hi there!'}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{greeting}</p>

        {showStreak && !sealed && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#fef3c7] text-xs">
              🎵
            </span>
            <b className="text-[18px] text-[#b45309] tabular-nums">{mainStreak}</b>
            <span className="text-[11px] text-[#a16207]">
              day main streak · {graceBank} grace banked
            </span>
          </div>
        )}

        {showStreak && sealed && (
          <div className="mt-2 w-max rounded-full border border-[#ecd9a8] bg-[#fdf0d2] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#92650a]">
            {dayLabel ? `${dayLabel} — sealed` : 'Sealed'} 🎵&nbsp; Streak: <b>{mainStreak}</b>
          </div>
        )}
      </div>
    </div>
  )
}
