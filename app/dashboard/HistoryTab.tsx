'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  calcCompletion, getDayNumber, fmtDate, displayName, todayStr,
  NUTRI_OPTIONS, CATEGORIZED_PHYSICAL_IDS, totalMinutes,
  type UserConfig, type UserGoals, type DailyEntry,
} from '@/lib/constants'
import { SPIRIT, PHYSI, NUTRI, PERSO } from '@/lib/brand'
import WeeklyReview from './WeeklyReview'

type Pillar = 's' | 'p' | 'n' | 'pe'

type Props = {
  history:   DailyEntry[]
  goals:     UserGoals
  config:    UserConfig
  onEditDay: (date: string, pillar?: Pillar) => void
}

// ── Per-pillar completion % ───────────────────────────────────────────────────
function pillarPct(pillar: string, entry: DailyEntry, goals: UserGoals): number | null {
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
      const acts   = entry.activities ?? []
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

const PILLAR_META = [
  { key: 'spiritual',   pillarId: 's'  as Pillar, icon: '/Spiritual_Icon_Bk.png',   label: 'Spiritual',   color: SPIRIT.light, border: SPIRIT.border, dark: SPIRIT.dark },
  { key: 'physical',    pillarId: 'p'  as Pillar, icon: '/Physical_Icon_Bk.png',    label: 'Physical',    color: PHYSI.light,  border: PHYSI.border,  dark: PHYSI.dark  },
  { key: 'nutritional', pillarId: 'n'  as Pillar, icon: '/Nutritional_Icon_Bk.png', label: 'Nutritional', color: NUTRI.light,  border: NUTRI.border,  dark: NUTRI.dark  },
  { key: 'personal',    pillarId: 'pe' as Pillar, icon: '/Personal_Icon_Bk.png',    label: 'Personal',    color: PERSO.light,  border: PERSO.border,  dark: PERSO.dark  },
] as const

// ── Per-pillar activity detail items ─────────────────────────────────────────
type DetailItem = { label: string; done: boolean }

function pillarDetailItems(pillar: string, entry: DailyEntry, goals: UserGoals): DetailItem[] {
  switch (pillar) {
    case 'spiritual': {
      const inc = goals.spiritual.filter(g => g.included)
      if (!inc.length) return []
      return inc.map(g => {
        if (g.goalType === 'tiered') {
          const sel = entry.tiered_selections?.[g.id]
          return { label: sel ? `${displayName(g)}: ${sel}` : displayName(g), done: !!sel }
        }
        return { label: displayName(g), done: !!entry.spiritual?.[g.id] }
      })
    }
    case 'physical': {
      const items: DetailItem[] = []
      const acts = (entry.activities ?? []).filter(a => (a.duration || 0) > 0)
      // Individual logged activities
      acts.forEach(a => {
        const name = [a.type, a.category].filter(Boolean).join(' · ') || 'Activity'
        items.push({ label: `${name} (${a.duration}min)`, done: true })
      })
      // Sleep & weight metrics
      items.push(entry.sleep
        ? { label: `Sleep: ${entry.sleep}h`, done: true }
        : { label: 'Sleep', done: false })
      if (entry.weight)
        items.push({ label: `Weight: ${entry.weight} lbs`, done: true })
      // Included physical goals that aren't activity-category types (steps, sleep_goal, etc.)
      goals.physical.filter(g => g.included).forEach(g => {
        if ((CATEGORIZED_PHYSICAL_IDS as readonly string[]).includes(g.id)) return
        if (g.goalType === 'tiered') {
          const sel = entry.tiered_selections?.[g.id]
          items.push({ label: sel ? `${displayName(g)}: ${sel}` : displayName(g), done: !!sel })
        } else {
          items.push({ label: displayName(g), done: !!entry.physical_goals?.[g.id] })
        }
      })
      return items
    }
    case 'nutritional': {
      if (!goals.nutritional.length) return []
      return goals.nutritional.map(id => {
        if (id === 'track_calories') {
          const log = entry.nutritional_log ?? {}
          const hasData = Object.values(log).some(v => v != null && Number(v) > 0)
          const label = hasData && log.calories != null
            ? `Calories: ${log.calories} kcal`
            : 'Track Calories'
          return { label, done: hasData }
        }
        const opt = NUTRI_OPTIONS.find(o => o.id === id)
        return { label: opt?.label ?? id, done: !!entry.nutritional?.[id] }
      })
    }
    case 'personal': {
      const inc = goals.personal.filter(g => g.included)
      if (!inc.length) return []
      return inc.map(g => {
        if (g.goalType === 'tiered') {
          const sel = entry.tiered_selections?.[g.id]
          return { label: sel ? `${displayName(g)}: ${sel}` : displayName(g), done: !!sel }
        }
        return { label: displayName(g), done: !!entry.personal?.[g.id] }
      })
    }
    default: return []
  }
}

export default function HistoryTab({ history, goals, config, onEditDay }: Props) {
  const [view, setView]           = useState<'history' | 'weekly'>('history')
  const [expandedDate, setExpanded] = useState<string | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function pctLabel(pct: number) {
    if (pct >= 80) return 'bg-green-100 text-green-800'
    if (pct >= 40) return 'bg-amber-100 text-amber-800'
    return 'bg-red-100 text-red-800'
  }

  /** True when entry was saved/modified on a date later than the entry_date itself. */
  function isEdited(entry: DailyEntry): boolean {
    if (!entry.updated_at) return false
    const updatedDay = entry.updated_at.split('T')[0]
    return updatedDay > entry.entry_date
  }

  /** Build a descending list of every calendar date from Day 1 of the challenge up to today. */
  function getAllDays(): string[] {
    const days: string[] = []
    const start = new Date(config.start_date + 'T00:00:00')
    const end   = new Date(todayStr()        + 'T00:00:00')
    const d     = new Date(end)
    while (d >= start) {
      days.push(d.toISOString().split('T')[0])
      d.setDate(d.getDate() - 1)
    }
    return days
  }

  // ── CSV export ───────────────────────────────────────────────────────────────

  function exportCSV() {
    const rows = [
      [
        'Date', 'Day', 'Completion%', 'Sleep', 'Weight', 'BP', 'Total Ex (min)',
        ...goals.spiritual.filter(g => g.included).map(g => displayName(g)),
        ...goals.nutritional.map(id => NUTRI_OPTIONS.find(o => o.id === id)?.label ?? id),
        ...(goals.nutritional.includes('track_calories') ? ['Calories', 'Protein(g)', 'Carbs(g)', 'Fat(g)', 'Fiber(g)'] : []),
        ...goals.personal.filter(g => g.included).map(g => displayName(g)),
      ],
      ...history.map(e => {
        const pct   = calcCompletion(e, goals)
        const exMin = (e.activities ?? []).reduce((s, a) => s + (a.duration || 0), 0)
        const log   = e.nutritional_log ?? {}
        return [
          e.entry_date,
          getDayNumber(config.start_date, e.entry_date),
          pct,
          e.sleep ?? '',
          e.weight ?? '',
          e.blood_pressure ?? '',
          exMin,
          ...goals.spiritual.filter(g => g.included).map(g => e.spiritual?.[g.id] ? 'Yes' : 'No'),
          ...goals.nutritional.map(id => {
            if (id === 'track_calories') return Object.values(log).some(v => v != null && Number(v) > 0) ? 'Yes' : 'No'
            return e.nutritional?.[id] ? 'Yes' : 'No'
          }),
          ...(goals.nutritional.includes('track_calories') ? [log.calories ?? '', log.protein ?? '', log.carbs ?? '', log.fat ?? '', log.fiber ?? ''] : []),
          ...goals.personal.filter(g => g.included).map(g => e.personal?.[g.id] ? 'Yes' : 'No'),
        ]
      }),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a   = document.createElement('a')
    a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'daily-tracker-history.csv'
    a.click()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const allDays    = getAllDays()
  const entryMap   = new Map(history.map(e => [e.entry_date, e]))

  return (
    <div className="space-y-4">

      {/* View toggle */}
      <div className="flex items-center gap-2 bg-dct-surface border border-dct-border rounded-xl p-1">
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === 'history' ? 'bg-spirit text-white' : 'text-dct-muted hover:text-dct-text'}`}>
          📅 Entry History
        </button>
        <button
          onClick={() => setView('weekly')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === 'weekly' ? 'bg-spirit text-white' : 'text-dct-muted hover:text-dct-text'}`}>
          📊 Weekly Review
        </button>
      </div>

      {/* ── Weekly Review ── */}
      {view === 'weekly' && (
        <WeeklyReview history={history} goals={goals} onEditDay={onEditDay} />
      )}

      {/* ── Entry History ── */}
      {view === 'history' && (<>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">📅 All Entries</h2>
          <button onClick={exportCSV} className="px-3 py-1.5 bg-dct-surface2 border border-dct-border text-dct-muted text-xs font-bold rounded-lg hover:text-dct-text transition-colors">
            ⬇️ Export CSV
          </button>
        </div>

        {allDays.length === 0 ? (
          <div className="text-center py-16 text-dct-muted">
            <div className="text-4xl mb-3">📭</div>
            <p>No entries yet. Start logging!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allDays.map(dateStr => {
              const entry = entryMap.get(dateStr)
              const day   = getDayNumber(config.start_date, dateStr)

              /* ── Missing day ── */
              if (!entry) {
                return (
                  <button
                    key={dateStr}
                    onClick={() => onEditDay(dateStr)}
                    className="w-full text-left rounded-xl px-4 py-3 hover:brightness-110 transition-all group border border-transparent hover:border-spirit"
                    style={{ backgroundColor: '#808284' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-sm text-black">Day {day}</span>
                        <span className="text-white text-xs ml-2">{fmtDate(dateStr)}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white group-hover:bg-spirit/80 transition-colors">
                        + Add Entry
                      </span>
                    </div>
                  </button>
                )
              }

              /* ── Logged day ── */
              const pct    = calcCompletion(entry, goals)
              const exMin  = (entry.activities ?? []).reduce((s, a) => s + (a.duration || 0), 0)
              const edited = isEdited(entry)
              const isOpen = expandedDate === dateStr

              return (
                <div key={dateStr} className="space-y-1">
                  {/* Row header — click to expand/collapse */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : dateStr)}
                    className="w-full text-left rounded-xl p-4 hover:brightness-110 transition-all group"
                    style={{ backgroundColor: '#808284' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-black">Day {day}</span>
                        <span className="text-white text-xs">{fmtDate(dateStr)}</span>
                        {edited && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${SPIRIT.light}33`, color: SPIRIT.light, border: `1px solid ${SPIRIT.light}66` }}>
                            ✏️ edited
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${pctLabel(pct)}`}>{pct}%</span>
                        <span className="text-[10px] text-white group-hover:text-white/80 transition-colors">
                          {isOpen ? '▲ Close' : '▼ Details'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-white">
                      {exMin > 0 && `⚡ ${exMin}min exercise`}
                      {entry.sleep  ? ` · 😴 ${entry.sleep}h sleep`   : ''}
                      {entry.weight ? ` · ⚖️ ${entry.weight}lbs`      : ''}
                    </div>
                  </button>

                  {/* Mini pillar detail panel */}
                  {isOpen && (
                    <div className="grid grid-cols-2 gap-2 px-1">
                      {PILLAR_META.map(p => {
                        const pct     = pillarPct(p.key, entry, goals)
                        const items   = pillarDetailItems(p.key, entry, goals)
                        const pctColor = pct === null ? '#6b7280'
                          : pct >= 80 ? '#4ade80'
                          : pct >= 40 ? '#fbbf24'
                          : '#f87171'
                        return (
                          <button
                            key={p.key}
                            onClick={() => onEditDay(dateStr, p.pillarId)}
                            className="text-left rounded-xl p-3 hover:brightness-110 transition-all border"
                            style={{ backgroundColor: p.dark, borderColor: p.border }}
                          >
                            {/* Pillar header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-shrink-0 w-4 h-4">
                                  <Image src={p.icon} alt="" fill className="object-contain" />
                                </div>
                                <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.label}</span>
                              </div>
                              {pct !== null && (
                                <span className="text-[11px] font-black" style={{ color: pctColor }}>{pct}%</span>
                              )}
                            </div>

                            {/* Activity detail lines */}
                            {items.length === 0 ? (
                              <p className="text-[10px] text-white/50 italic">No goals set</p>
                            ) : (
                              <ul className="space-y-0.5 mb-2">
                                {items.map((item, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className={`mt-px text-[10px] font-black flex-shrink-0 ${item.done ? 'text-green-300' : 'text-white/40'}`}>
                                      {item.done ? '✓' : '✗'}
                                    </span>
                                    <span className={`text-[10px] leading-tight ${item.done ? 'text-white' : 'text-white/50'}`}>
                                      {item.label}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            <div className="text-[10px] text-white/40 border-t pt-1.5 mt-0.5" style={{ borderColor: `${p.border}88` }}>
                              Tap to edit →
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </>)}
    </div>
  )
}
