'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  calcCompletion, totalMinutes, CATEGORIZED_PHYSICAL_IDS,
  type UserGoals, type DailyEntry,
} from '@/lib/constants'
import { getWeeklyNote, saveWeeklyNote } from '@/app/actions'
import { SPIRIT, PHYSI, NUTRI, PERSO } from '@/lib/brand'

// ── Pillar colours — sourced from lib/brand.ts ────────────────────────────────
const PILLARS = [
  { key: 'spiritual',   icon: '🙏', label: 'Spiritual',   color: SPIRIT.light },
  { key: 'physical',    icon: '💪', label: 'Physical',    color: PHYSI.light  },
  { key: 'nutritional', icon: '🥗', label: 'Nutritional', color: NUTRI.light  },
  { key: 'personal',    icon: '📝', label: 'Personal',    color: PERSO.light  },
] as const

// ── Per-pillar % for a single entry ──────────────────────────────────────────
function pillarPct(pillar: string, entry: DailyEntry | null, goals: UserGoals): number | null {
  if (!entry) return null
  switch (pillar) {
    case 'spiritual': {
      const inc = goals.spiritual.filter(g => g.included)
      if (!inc.length) return null
      const done = inc.filter(g =>
        g.goalType === 'tiered'
          ? !!(entry.tiered_selections?.[g.id])
          : !!entry.spiritual?.[g.id]
      ).length
      return Math.round(done / inc.length * 100)
    }
    case 'physical': {
      const acts = entry.activities ?? []
      const checks: boolean[] = [!!entry.sleep, !!entry.weight]
      goals.physical.filter(g => g.included).forEach(g => {
        if ((CATEGORIZED_PHYSICAL_IDS as readonly string[]).includes(g.id)) {
          const subs = g.subTypes ?? []
          checks.push(subs.length > 0
            ? acts.some(a => subs.includes(a.category ?? '') && (a.duration || 0) > 0)
            : totalMinutes(acts) > 0)
        } else if (g.goalType === 'tiered') {
          checks.push(!!(entry.tiered_selections?.[g.id]))
        } else {
          checks.push(!!entry.physical_goals?.[g.id])
        }
      })
      if (!goals.physical.find(g => g.id === 'exercise_training' && g.included)) {
        checks.push(totalMinutes(acts) > 0)
      }
      return checks.length ? Math.round(checks.filter(Boolean).length / checks.length * 100) : null
    }
    case 'nutritional': {
      if (!goals.nutritional.length) return null
      let done = 0
      goals.nutritional.forEach(id => {
        if (id === 'track_calories') {
          const log = entry.nutritional_log ?? {}
          if (Object.values(log).some(v => v != null && Number(v) > 0)) done++
        } else {
          if (entry.nutritional?.[id]) done++
        }
      })
      return Math.round(done / goals.nutritional.length * 100)
    }
    case 'personal': {
      const inc = goals.personal.filter(g => g.included)
      if (!inc.length) return null
      const done = inc.filter(g =>
        g.goalType === 'tiered'
          ? !!(entry.tiered_selections?.[g.id])
          : !!entry.personal?.[g.id]
      ).length
      return Math.round(done / inc.length * 100)
    }
    default: return null
  }
}

function pctStyle(pct: number | null) {
  if (pct === null) return { text: 'text-white/60', bg: '' }
  if (pct >= 80)    return { text: 'text-green-700',  bg: '' }
  if (pct >= 40)    return { text: 'text-amber-700',  bg: '' }
  return                   { text: 'text-red-700',    bg: '' }
}
const GRID_BG    = '#808284'
const PCT_CELL_BG = '#d1d5db'

// ── Week date helpers ─────────────────────────────────────────────────────────
function getWeekDates(offset: number): Date[] {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + offset * 7)
  sunday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

type Pillar = 's' | 'p' | 'n' | 'pe'

const PILLAR_ID_MAP: Record<string, Pillar> = {
  spiritual:   's',
  physical:    'p',
  nutritional: 'n',
  personal:    'pe',
}

// ── Component ─────────────────────────────────────────────────────────────────
type Props = {
  history:    DailyEntry[]
  goals:      UserGoals
  onEditDay?: (date: string, pillar?: Pillar) => void   // when provided, grid cells become clickable
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function WeeklyReview({ history, goals, onEditDay }: Props) {
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [notes,       setNotes]       = useState('')
  const [isPending,   startTransition] = useTransition()
  const [toast,       setToast]       = useState<string | null>(null)

  const weekDates = getWeekDates(weekOffset)
  const weekStart = dateKey(weekDates[0])
  const todayKey  = dateKey(new Date())

  // Load saved notes whenever the week changes
  useEffect(() => {
    getWeeklyNote(weekStart).then(setNotes)
  }, [weekStart])

  function entryFor(d: Date): DailyEntry | null {
    return history.find(e => e.entry_date === dateKey(d)) ?? null
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveWeeklyNote(weekStart, notes)
        showToast('Notes saved ✓')
      } catch {
        showToast('❌ Save failed')
      }
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Weekly averages
  const loggedDays = weekDates.filter(d => entryFor(d) !== null)
  const weekAvg = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((sum, d) => sum + calcCompletion(entryFor(d), goals), 0) / loggedDays.length)
    : null

  return (
    <div className="space-y-4">

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-dct-surface border border-dct-border rounded-xl px-4 py-3">
        <button onClick={() => setWeekOffset(o => o - 1)}
          className="text-xs font-bold text-dct-muted hover:text-dct-text px-2 py-1 rounded transition-colors">
          ← Prev
        </button>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-dct-muted">Week of</div>
          <div className="text-sm font-bold">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {weekAvg !== null && (
            <div className="text-[10px] text-dct-muted mt-0.5">
              Week avg: <span className={weekAvg >= 80 ? 'text-green-600' : weekAvg >= 40 ? 'text-amber-600' : 'text-red-600'} style={{ fontWeight: 700 }}>{weekAvg}%</span>
              {' · '}{loggedDays.length}/7 days logged
            </div>
          )}
        </div>
        <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
          disabled={weekOffset >= 0}
          className={`text-xs font-bold px-2 py-1 rounded transition-colors ${weekOffset >= 0 ? 'text-dct-surface2 cursor-default' : 'text-dct-muted hover:text-dct-text'}`}>
          Next →
        </button>
      </div>

      {/* Summary grid — label col fixed-narrow, 7 day cols share remaining space */}
      <div className="border border-dct-border rounded-xl overflow-hidden" style={{ backgroundColor: GRID_BG }}>

        {/* Day headers */}
        <div className="grid border-b border-black/20" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
          <div className="px-1 py-2" />
          {weekDates.map((d, i) => {
            const key     = dateKey(d)
            const isToday = key === todayKey
            const canEdit = !!onEditDay && key <= todayKey
            return (
              <div
                key={i}
                onClick={() => canEdit && onEditDay!(key)}
                title={canEdit ? `Edit ${key}` : undefined}
                className={`px-0.5 py-2 text-center transition-colors ${isToday ? 'bg-spirit/20' : ''} ${canEdit ? 'cursor-pointer hover:bg-white/10' : ''}`}
              >
                <div className={`text-[9px] font-bold uppercase leading-none ${isToday ? 'text-spirit-lt' : 'text-white/70'}`}>
                  {DAY_LABELS[d.getDay()]}
                </div>
                <div className={`text-[11px] font-black mt-0.5 ${isToday ? 'text-spirit-lt' : 'text-white/70'}`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pillar rows */}
        {PILLARS.map(p => (
          <div key={p.key} className="grid border-b border-black/20 last:border-0" style={{ gridTemplateColumns: '44px repeat(7, 1fr)' }}>
            <div className="px-1 py-2 flex flex-col items-center justify-center gap-0.5">
              <span className="text-sm leading-none">{p.icon}</span>
              <span className="text-[8px] font-bold leading-none" style={{ color: p.color }}>{p.label.slice(0,4)}</span>
            </div>
            {weekDates.map((d, i) => {
              const key     = dateKey(d)
              const entry   = entryFor(d)
              const pct     = pillarPct(p.key, entry, goals)
              const s       = pctStyle(pct)
              const isToday = key === todayKey
              const canEdit = !!onEditDay && key <= todayKey
              const pillarId = PILLAR_ID_MAP[p.key]
              return (
                <div
                  key={i}
                  onClick={() => canEdit && onEditDay!(key, pillarId)}
                  title={canEdit ? `Edit ${p.label} on ${key}` : undefined}
                  className={`px-0.5 py-2 text-center transition-colors ${isToday ? 'ring-inset ring-1 ring-spirit/20' : ''} ${canEdit ? 'cursor-pointer hover:brightness-125' : ''}`}
                  style={pct !== null ? { backgroundColor: PCT_CELL_BG } : undefined}
                >
                  <span className={`text-[10px] font-black ${s.text}`}
                    style={pct !== null ? { textShadow: '0 1px 3px rgba(0,0,0,0.7)' } : undefined}>
                    {pct === null ? '—' : `${pct}%`}
                  </span>
                </div>
              )
            })}
          </div>
        ))}

        {/* Overall row */}
        <div className="grid border-t border-black/30" style={{ gridTemplateColumns: '44px repeat(7, 1fr)', backgroundColor: '#6b6d6f' }}>
          <div className="px-1 py-2 flex items-center justify-center">
            <span className="text-[8px] font-black text-white/70 uppercase tracking-wide leading-tight text-center">All</span>
          </div>
          {weekDates.map((d, i) => {
            const key     = dateKey(d)
            const entry   = entryFor(d)
            const pct     = entry ? calcCompletion(entry, goals) : null
            const s       = pctStyle(pct)
            const canEdit = !!onEditDay && key <= todayKey
            return (
              <div
                key={i}
                onClick={() => canEdit && onEditDay!(key)}
                title={canEdit ? `Edit ${key}` : undefined}
                className={`px-0.5 py-2 text-center transition-colors ${canEdit ? 'cursor-pointer hover:brightness-125' : ''}`}
                style={pct !== null ? { backgroundColor: PCT_CELL_BG } : undefined}
              >
                <span className={`text-[10px] font-black ${s.text}`}
                  style={pct !== null ? { textShadow: '0 1px 3px rgba(0,0,0,0.7)' } : undefined}>
                  {pct === null ? '—' : `${pct}%`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Colour legend */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[10px] text-dct-muted px-1">
        <span className="font-bold uppercase tracking-wider">Legend:</span>
        {[
          { dot: 'bg-green-500', label: '≥ 80%' },
          { dot: 'bg-amber-400', label: '40–79%' },
          { dot: 'bg-red-500',   label: '< 40%' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${l.dot}`} />
            {l.label}
          </span>
        ))}
        <span>— = No entry logged</span>
      </div>

      {/* Weekly notes */}
      <div className="bg-dct-surface border border-dct-border rounded-xl p-4 space-y-3">
        <div className="text-sm font-black">📝 Weekly Reflection Notes</div>
        <p className="text-xs text-dct-muted leading-relaxed">
          Capture what went well, what to improve, and your intentions for the week ahead.
          Notes are saved per week and persist to your account.
        </p>
        <textarea
          className="w-full px-3 py-2.5 bg-dct-bg border border-dct-border rounded-lg text-dct-text text-sm outline-none focus:border-spirit transition-colors resize-none leading-relaxed"
          rows={6}
          placeholder="This week I noticed… / Next week I want to focus on… / Gratitude for…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={isPending}
            className="px-5 py-2 text-white text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: `linear-gradient(135deg,${SPIRIT.primary},${PERSO.primary})` }}>
            {isPending ? 'Saving...' : '💾 Save Notes'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-dct-surface border border-dct-success text-dct-success px-5 py-2 rounded-lg font-bold text-sm shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
