'use client'

import type { ChallengeEntry } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

type PillarCol = 'spiritual' | 'physical_goals' | 'nutritional' | 'personal'

const PILLAR_COL: Record<string, PillarCol> = {
  spiritual:   'spiritual',
  physical:    'physical_goals',
  nutritional: 'nutritional',
  personal:    'personal',
}

const PILLAR_DOT: Record<string, string> = {
  spiritual:   'bg-[#4a90d9]',
  physical:    'bg-[#6b8dd6]',
  nutritional: 'bg-[#d4863a]',
  personal:    'bg-[#5aab6e]',
}

function isPillarComplete(entry: ChallengeEntry, pillar: string): boolean {
  const col = PILLAR_COL[pillar]
  if (!col) return false
  const val = entry[col] as Record<string, unknown>
  return val?.challenge_complete === true
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  startDate: string
  entries:   ChallengeEntry[]
  pillars:   string[]
  today:     string
  onEdit:    (date: string, completions: Record<string, boolean>) => void
}

export default function HistoryList({ startDate, entries, pillars, today, onEdit }: Props) {
  const entryMap = new Map(entries.map(e => [e.entry_date, e]))
  const startMs  = new Date(startDate + 'T00:00:00').getTime()

  // Build descending list of all past days (excludes today)
  const days: { date: string; dayNum: number }[] = []
  const cursor = new Date(today + 'T00:00:00')
  cursor.setDate(cursor.getDate() - 1)
  while (cursor.getTime() >= startMs) {
    const dateStr = new Intl.DateTimeFormat('en-CA').format(cursor)
    const dayNum  = Math.floor((cursor.getTime() - startMs) / 86400000) + 1
    days.push({ date: dateStr, dayNum })
    cursor.setDate(cursor.getDate() - 1)
  }

  if (days.length === 0) {
    return (
      <div className="bg-white border border-[var(--card-border)] rounded-2xl p-8 text-center">
        <p className="text-2xl mb-2">📋</p>
        <p className="text-sm text-[var(--text-secondary)]">No past days yet. Check back after Day 1.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]">Past Days</p>
      <div className="space-y-2">
        {days.map(({ date, dayNum }) => {
          const entry       = entryMap.get(date)
          const completions = Object.fromEntries(
            pillars.map(p => [p, entry ? isPillarComplete(entry, p) : false])
          )
          const isComplete = pillars.length > 0 && pillars.every(p => completions[p])
          const hasEntry   = !!entry

          return (
            <div
              key={date}
              className="bg-white border border-[var(--card-border)] rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Day {dayNum}</span>
                  <span className="text-xs text-[var(--text-muted)]">{formatDate(date)}</span>
                  {isComplete && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      ✓ Complete
                    </span>
                  )}
                  {!hasEntry && (
                    <span className="text-[10px] text-[var(--text-muted)] bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">
                      Not logged
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {pillars.map(p => (
                    <div
                      key={p}
                      className={`w-2.5 h-2.5 rounded-full ${completions[p] ? (PILLAR_DOT[p] ?? 'bg-gray-400') : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={() => onEdit(date, completions)}
                className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                {hasEntry ? 'Edit' : '+ Add'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
