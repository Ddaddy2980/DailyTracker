'use client'

import type { RewardType } from '@/lib/types'

interface Props {
  rewards:   RewardType[]
  onDismiss: () => void
}

const REWARD_UI: Record<RewardType, { title: string; subtitle: string; icon: string; color: string; ring: string }> = {
  day1_complete:    { title: 'Day 1 Done',        subtitle: 'You showed up. That\'s how it starts.',          icon: '🔥', color: 'bg-purple-950 border-purple-700', ring: 'ring-purple-500' },
  day3_survival:    { title: 'Day 3 Survivor',    subtitle: 'The hardest day. You didn\'t quit.',             icon: '⚔️', color: 'bg-red-950 border-red-700',    ring: 'ring-red-500'    },
  halfway:          { title: 'Halfway There',     subtitle: 'Four days down. Three to go. Don\'t stop now.',  icon: '⚡', color: 'bg-amber-950 border-amber-700', ring: 'ring-amber-500'  },
  day7_complete:    { title: 'Day 7 Complete',    subtitle: 'You finished the challenge.',                    icon: '✅', color: 'bg-emerald-950 border-emerald-700', ring: 'ring-emerald-500' },
  starter_badge:    { title: 'Starter Badge',     subtitle: 'You earned the Starter badge.',                  icon: '🏅', color: 'bg-purple-950 border-purple-700', ring: 'ring-purple-500' },
  builder_badge:    { title: 'Builder Badge',     subtitle: 'Level 2 unlocked.',                              icon: '🏗️', color: 'bg-blue-950 border-blue-700',    ring: 'ring-blue-500'   },
  consistent_badge: { title: 'Consistent Badge',  subtitle: 'Level 3 unlocked.',                              icon: '🎯', color: 'bg-emerald-950 border-emerald-700', ring: 'ring-emerald-500' },
  refiner_badge:    { title: 'Refiner Badge',     subtitle: 'Level 4 unlocked.',                              icon: '💎', color: 'bg-amber-950 border-amber-700',  ring: 'ring-amber-500'  },
  guide_badge:      { title: 'Guide Badge',       subtitle: 'Level 5 unlocked.',                              icon: '🌟', color: 'bg-slate-800 border-slate-500',  ring: 'ring-white'      },
}

// Only show one reward at a time (the first non-day7/non-starter reward in the list)
const INLINE_REWARDS: RewardType[] = ['day1_complete', 'day3_survival', 'halfway']

export default function RewardUnlock({ rewards, onDismiss }: Props) {
  const reward = rewards.find(r => INLINE_REWARDS.includes(r))
  if (!reward) return null

  const ui = REWARD_UI[reward]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center px-4 pb-8" onClick={onDismiss}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm rounded-3xl border-2 p-6 text-center shadow-2xl ring-4 ring-offset-4 ring-offset-slate-950 ${ui.color} ${ui.ring}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">{ui.icon}</div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Reward Unlocked
        </p>
        <h2 className="text-2xl font-black text-white mb-2">{ui.title}</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{ui.subtitle}</p>

        <button
          onClick={onDismiss}
          className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-white transition-colors"
        >
          Keep going →
        </button>
      </div>
    </div>
  )
}
