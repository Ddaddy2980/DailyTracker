'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { updatePillarGoals } from '@/app/actions'
import type { Challenge } from '@/lib/types'
import { LEVEL_NAMES } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  spiritual: 'Spiritual', physical: 'Physical', nutritional: 'Nutritional', personal: 'Personal',
}

const PILLAR_ICON: Record<string, string> = {
  spiritual:   '/Spiritual_Icon_Bk.png',
  physical:    '/Physical_Icon_Bk.png',
  nutritional: '/Nutritional_Icon_Bk.png',
  personal:    '/Personal_Icon_Bk.png',
}

const PILLAR_CLASS: Record<string, string> = {
  spiritual:   'pillar-spiritual',
  physical:    'pillar-physical',
  nutritional: 'pillar-nutritional',
  personal:    'pillar-personal',
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  challenge:   Challenge
  pillars:     string[]
  pillarGoals: Record<string, string>
  onSaved:     () => void
}

export default function ChallengeGoalsTab({ challenge, pillars, pillarGoals, onSaved }: Props) {
  const [isPending, startTransition] = useTransition()
  const [goals, setGoals]   = useState<Record<string, string>>(pillarGoals)
  const [saved, setSaved]   = useState(false)

  const levelName = LEVEL_NAMES[challenge.level] ?? `Level ${challenge.level}`
  const startDate = new Date(challenge.start_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const endDate = new Date(challenge.end_date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const isDirty = pillars.some(p => goals[p] !== pillarGoals[p])

  function handleSave() {
    startTransition(async () => {
      await updatePillarGoals(challenge.id, goals)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved()
    })
  }

  return (
    <div className="space-y-5">

      {/* Challenge info */}
      <div className="bg-white border border-[var(--card-border)] rounded-2xl px-4 py-4 space-y-1.5">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">
          Level {challenge.level} — {levelName}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">{startDate} → {endDate}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {challenge.duration_days}-day challenge · {challenge.days_completed} days complete
        </p>
      </div>

      {/* Pillar goals */}
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">Your Goals</p>
        {pillars.map(pillar => (
          <div key={pillar} className={`rounded-2xl px-4 py-3 space-y-2 ${PILLAR_CLASS[pillar] ?? 'bg-gray-700'}`}>
            <div className="flex items-center gap-1.5">
              {PILLAR_ICON[pillar] && (
                <Image
                  src={PILLAR_ICON[pillar]}
                  width={20}
                  height={20}
                  alt={PILLAR_LABEL[pillar] ?? pillar}
                  className="invert"
                />
              )}
              <p className="text-xs font-bold uppercase tracking-wide text-white">
                {PILLAR_LABEL[pillar] ?? pillar}
              </p>
            </div>
            <input
              type="text"
              value={goals[pillar] ?? ''}
              onChange={e => setGoals(prev => ({ ...prev, [pillar]: e.target.value }))}
              className="w-full text-sm text-white bg-transparent border-b border-white/40 pb-1 focus:outline-none focus:border-white/80 transition-colors placeholder:text-white/50"
              placeholder={`${PILLAR_LABEL[pillar] ?? pillar} goal…`}
            />
          </div>
        ))}
      </div>

      {/* Save */}
      {isDirty && (
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      )}

      {saved && !isDirty && (
        <p className="text-center text-sm text-emerald-600 font-semibold">Goals saved ✓</p>
      )}

    </div>
  )
}
