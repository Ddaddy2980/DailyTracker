'use client'

import type { RewardType } from '@/lib/types'

interface Props {
  earned: RewardType[]
}

const MILESTONES: { reward: RewardType; day: number; label: string; icon: string; earned: string; pending: string }[] = [
  { reward: 'day1_complete', day: 1, label: 'Day 1', icon: '🔥', earned: 'bg-purple-900 border-purple-600 text-purple-300', pending: 'bg-slate-800 border-slate-700 text-slate-600' },
  { reward: 'day3_survival', day: 3, label: 'Day 3', icon: '⚔️', earned: 'bg-red-900 border-red-700 text-red-300',       pending: 'bg-slate-800 border-slate-700 text-slate-600' },
  { reward: 'halfway',       day: 4, label: 'Day 4', icon: '⚡', earned: 'bg-amber-900 border-amber-600 text-amber-300', pending: 'bg-slate-800 border-slate-700 text-slate-600' },
  { reward: 'day7_complete', day: 7, label: 'Done',  icon: '🏅', earned: 'bg-emerald-900 border-emerald-600 text-emerald-300', pending: 'bg-slate-800 border-slate-700 text-slate-600' },
]

export default function EarnedBadges({ earned }: Props) {
  const earnedSet = new Set(earned)

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
        Milestones
      </p>
      <div className="flex gap-2">
        {MILESTONES.map(m => {
          const isEarned = earnedSet.has(m.reward)
          return (
            <div
              key={m.reward}
              className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all ${
                isEarned ? m.earned : m.pending
              }`}
            >
              <span className={`text-xl ${isEarned ? '' : 'grayscale opacity-30'}`}>
                {m.icon}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {m.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
