'use client'

import type { RewardType } from '@/lib/types'

interface Props {
  earned:   RewardType[]
  compact?: boolean
}

const MILESTONES: { reward: RewardType; day: number; label: string; icon: string; earned: string; pending: string }[] = [
  { reward: 'day1_complete', day: 1, label: 'Day 1', icon: '🔥', earned: 'bg-purple-100 border-purple-400 text-purple-700', pending: 'bg-gray-100 border-gray-200 text-gray-400' },
  { reward: 'day3_survival', day: 3, label: 'Day 3', icon: '⚔️', earned: 'bg-red-100 border-red-400 text-red-700',          pending: 'bg-gray-100 border-gray-200 text-gray-400' },
  { reward: 'halfway',       day: 4, label: 'Day 4', icon: '⚡', earned: 'bg-amber-100 border-amber-400 text-amber-700',    pending: 'bg-gray-100 border-gray-200 text-gray-400' },
  { reward: 'day7_complete', day: 7, label: 'Done',  icon: '🏅', earned: 'bg-emerald-100 border-emerald-400 text-emerald-700', pending: 'bg-gray-100 border-gray-200 text-gray-400' },
]

export default function EarnedBadges({ earned, compact = false }: Props) {
  const earnedSet = new Set(earned)

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          Milestones
        </p>
      )}
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'}`}>
        {MILESTONES.map(m => {
          const isEarned = earnedSet.has(m.reward)
          return (
            <div
              key={m.reward}
              className={`flex-1 flex flex-col items-center rounded-2xl border transition-all ${
                compact ? 'gap-0.5 py-1 px-1' : 'gap-1 py-3'
              } ${isEarned ? m.earned : m.pending}`}
            >
              <span className={`${compact ? 'text-base' : 'text-xl'} ${isEarned ? '' : 'grayscale opacity-40'}`}>
                {m.icon}
              </span>
              <span className={`font-bold uppercase tracking-wider ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                {m.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
