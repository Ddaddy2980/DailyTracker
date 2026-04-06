'use client'

import { todayStr } from '@/lib/constants'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddFormState {
  goalName:        string
  frequencyTarget: number
  windowDays:      number
}

interface Props {
  form:       AddFormState
  error:      string | null
  isPending:  boolean
  onChange:   (next: AddFormState) => void
  onConfirm:  () => void
  onCancel:   () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return new Intl.DateTimeFormat('en-CA').format(d)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddDestinationGoalForm({ form, error, isPending, onChange, onConfirm, onCancel }: Props) {
  const today   = todayStr()
  const endDate = addDays(today, form.windowDays)

  return (
    <div className="space-y-3 bg-black/15 rounded-xl p-3">

      {/* Goal name */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
          What are you working toward?
        </label>
        <input
          type="text"
          value={form.goalName}
          onChange={e => onChange({ ...form, goalName: e.target.value })}
          placeholder="Goal name…"
          className="w-full text-sm text-white bg-transparent border-b border-white/40 pb-1 focus:outline-none focus:border-white/80 transition-colors placeholder:text-white/40"
        />
      </div>

      {/* Frequency selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
          How many times per week?
        </label>
        <div className="flex gap-1 flex-wrap">
          {[2, 3, 4, 5, 6, 7].map(n => (
            <button
              key={n}
              onClick={() => onChange({ ...form, frequencyTarget: n })}
              className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                form.frequencyTarget === n
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              {n}×
            </button>
          ))}
        </div>
      </div>

      {/* Window days */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
          How many days? <span className="normal-case font-normal">(14–66)</span>
        </label>
        <input
          type="number"
          min={14}
          max={66}
          value={form.windowDays}
          onChange={e => onChange({ ...form, windowDays: Math.min(66, Math.max(14, Number(e.target.value))) })}
          className="w-20 text-sm text-white bg-transparent border-b border-white/40 pb-1 focus:outline-none focus:border-white/80 transition-colors"
        />
      </div>

      {/* Date preview */}
      <div className="text-xs text-white/50 space-y-0.5">
        <p>Start: {formatDate(today)}</p>
        <p>End: {formatDate(endDate)}</p>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-40"
        >
          {isPending ? 'Saving…' : 'Confirm'}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
