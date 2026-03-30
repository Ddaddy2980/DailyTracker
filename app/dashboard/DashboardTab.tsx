'use client'

import { useState } from 'react'
import Image from 'next/image'
import Dial from './Dial'
import {
  getDayNumber, calcCompletion, calcPillarStreaks, displayName,
  todayStr, fmtDate, totalMinutes, CATEGORIZED_PHYSICAL_IDS, NUTRI_OPTIONS,
  type UserConfig, type UserGoals, type DailyEntry,
} from '@/lib/constants'
import { SPIRIT, PHYSI, NUTRI, PERSO } from '@/lib/brand'

// ── Pillar brand map ──────────────────────────────────────────────────────────
const PILLARS = {
  spirit: { bg: SPIRIT.dark, lt: SPIRIT.light, border: SPIRIT.border, icon: '/Spiritual_Icon_Bk.png',   label: 'Spiritual'   },
  physi:  { bg: PHYSI.dark,  lt: PHYSI.light,  border: PHYSI.border,  icon: '/Physical_Icon_Bk.png',    label: 'Physical'    },
  nutri:  { bg: NUTRI.dark,  lt: NUTRI.light,  border: NUTRI.border,  icon: '/Nutritional_Icon_Bk.png', label: 'Nutritional' },
  perso:  { bg: PERSO.dark,  lt: PERSO.light,  border: PERSO.border,  icon: '/Personal_Icon_Bk.png',    label: 'Personal'    },
}

function PillarIcon({ src, size = 20 }: { src: string; size?: number }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <Image src={src} alt="" fill className="object-contain" />
    </div>
  )
}

function StreakBadge({ count, color }: { count: number; color: string }) {
  return (
    <div className="text-[10px] font-semibold flex items-center gap-1" style={{ color: count > 0 ? color : '#64748b' }}>
      🔥 {count > 0 ? `${count} day${count !== 1 ? 's' : ''} in a row` : 'No streak yet'}
    </div>
  )
}

// ── Per-pillar completion % ───────────────────────────────────────────────────
function spiritualPct(entry: DailyEntry | null, goals: UserGoals) {
  const inc = goals.spiritual.filter(g => g.included)
  if (!inc.length) return 0
  return Math.round(inc.filter(g =>
    g.goalType === 'tiered'
      ? !!(entry?.tiered_selections?.[g.id])
      : !!entry?.spiritual?.[g.id]
  ).length / inc.length * 100)
}

function physicalPct(entry: DailyEntry | null, goals: UserGoals) {
  const acts = entry?.activities ?? []
  const checks: boolean[] = [!!entry?.sleep, !!entry?.weight]
  goals.physical.filter(g => g.included).forEach(g => {
    if ((CATEGORIZED_PHYSICAL_IDS as readonly string[]).includes(g.id)) {
      if (g.id === 'stretching') {
        checks.push(acts.some(a => a.category === 'Stretching' && (a.duration || 0) > 0))
      } else {
        const subs = g.subTypes ?? []
        if (subs.length > 0) {
          checks.push(acts.some(a => subs.includes(a.category ?? '') && (a.duration || 0) > 0))
        } else {
          checks.push(totalMinutes(acts) > 0)
        }
      }
    } else if (g.goalType === 'tiered') {
      checks.push(!!(entry?.tiered_selections?.[g.id]))
    } else {
      checks.push(!!entry?.physical_goals?.[g.id])
    }
  })
  if (!goals.physical.find(g => g.id === 'exercise_training' && g.included)) {
    checks.push(totalMinutes(acts) > 0)
  }
  return checks.length ? Math.round(checks.filter(Boolean).length / checks.length * 100) : 0
}

function nutritionalPct(entry: DailyEntry | null, goals: UserGoals) {
  if (!goals.nutritional.length) return 0
  let done = 0
  goals.nutritional.forEach(id => {
    if (id === 'track_calories') {
      const log = entry?.nutritional_log ?? {}
      if (Object.values(log).some(v => v != null && Number(v) > 0)) done++
    } else {
      if (entry?.nutritional?.[id]) done++
    }
  })
  return Math.round(done / goals.nutritional.length * 100)
}

function personalPct(entry: DailyEntry | null, goals: UserGoals) {
  const inc = goals.personal.filter(g => g.included)
  if (!inc.length) return 0
  return Math.round(inc.filter(g =>
    g.goalType === 'tiered'
      ? !!(entry?.tiered_selections?.[g.id])
      : !!entry?.personal?.[g.id]
  ).length / inc.length * 100)
}

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Single goal check row ─────────────────────────────────────────────────────
function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2.5 py-1 text-sm ${done ? 'text-dct-text' : 'text-dct-muted'}`}>
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-[11px] font-black"
        style={done
          ? { background: '#16a34a', color: '#fff' }
          : { background: 'transparent', border: '2px solid #334155', color: 'transparent' }
        }
      >
        ✓
      </span>
      <span className={done ? 'font-medium' : ''}>{label}</span>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
type PillarKey = 's' | 'p' | 'n' | 'pe'

type Props = {
  config:     UserConfig
  goals:      UserGoals
  todayEntry: DailyEntry | null
  history:    DailyEntry[]
  todayPct:   number
  onNavigate: (tab: 'dash' | 'log' | 'history' | 'goals') => void
  onGoToLog:  (pillar: PillarKey) => void
  onGoToDay:  (date: string, pillar?: PillarKey) => void
}

export default function DashboardTab({ config, goals, todayEntry, history, todayPct, onNavigate: _onNavigate, onGoToLog, onGoToDay }: Props) {
  const [viewingDate, setViewingDate] = useState(todayStr())
  const [openPillar, setOpenPillar]   = useState<PillarKey | null>(null)

  const isViewingToday = viewingDate === todayStr()

  // ── Day navigation ─────────────────────────────────────────────────────────
  const startDate = new Date(config.start_date + 'T00:00:00')

  function addDays(date: string, n: number): string {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  const canGoBack    = new Date(viewingDate + 'T00:00:00') > startDate
  const canGoForward = !isViewingToday

  function goBack()    { if (canGoBack)    setViewingDate(addDays(viewingDate, -1)) }
  function goForward() { if (canGoForward) setViewingDate(addDays(viewingDate,  1)) }

  // ── Viewed entry (today's live entry or historical) ────────────────────────
  const viewedEntry: DailyEntry | null = isViewingToday
    ? todayEntry
    : history.find(e => e.entry_date === viewingDate) ?? null

  // ── Log navigation ─────────────────────────────────────────────────────────
  function handlePillarLog(pillar: PillarKey, e: React.MouseEvent) {
    e.stopPropagation()
    if (isViewingToday) onGoToLog(pillar)
    else onGoToDay(viewingDate, pillar)
  }

  function togglePillar(p: PillarKey) {
    setOpenPillar(prev => prev === p ? null : p)
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const currentDay  = getDayNumber(config.start_date)
  const viewedDay   = getDayNumber(config.start_date, viewingDate)
  const progressPct = Math.min(100, Math.round((currentDay / config.duration) * 100))
  const viewedPct   = isViewingToday ? todayPct : calcCompletion(viewedEntry, goals)
  const exMin       = totalMinutes(viewedEntry?.activities ?? [])
  const streaks     = calcPillarStreaks(history, goals, todayStr())

  const sPct  = spiritualPct(viewedEntry, goals)
  const pPct  = physicalPct(viewedEntry, goals)
  const nPct  = nutritionalPct(viewedEntry, goals)
  const pePct = personalPct(viewedEntry, goals)

  // ── Friendly date label ────────────────────────────────────────────────────
  const dayLabel = isViewingToday
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : new Date(viewingDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-2">

      {/* ── Hero row: Day pill + overall ring ──────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div
          className="px-4 py-1.5 rounded-full border"
          style={{ background: SPIRIT.dark, borderColor: SPIRIT.border }}
        >
          <span className="text-base font-black text-white">Day {viewedDay}</span>
          <span className="text-sm font-medium" style={{ color: SPIRIT.light }}> of {config.duration}</span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <Dial pct={viewedPct} color={viewedPct === 100 ? '#4ade80' : SPIRIT.light} size={56} />
          <span className="text-[10px] text-dct-muted font-medium">
            {isViewingToday ? 'today' : fmtDate(viewingDate)}
          </span>
        </div>
      </div>

      {/* ── Journey progress bar ───────────────────────────────────────── */}
      <div className="px-1">
        <div className="h-1.5 bg-dct-surface2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: `linear-gradient(90deg,${SPIRIT.primary},${PHYSI.primary},${NUTRI.primary},${PERSO.primary})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-dct-muted">
          <span>Day 1</span>
          <span>{progressPct}%</span>
          <span>Day {config.duration}</span>
        </div>
      </div>

      {/* ── Day navigator ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-dct-surface border border-dct-border rounded-xl px-2 py-1.5">
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-lg font-black"
          style={{ color: canGoBack ? '#e2e8f0' : '#334155', background: canGoBack ? '#1e293b' : 'transparent' }}
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-black text-dct-text">
            {isViewingToday ? `Today — Day ${viewedDay}` : `Day ${viewedDay}`}
          </div>
          <div className="text-[11px] text-dct-muted">{dayLabel}</div>
        </div>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors text-lg font-black"
          style={{ color: canGoForward ? '#e2e8f0' : '#334155', background: canGoForward ? '#1e293b' : 'transparent' }}
        >
          ›
        </button>
      </div>

      {/* ── Accordion pillar cards ─────────────────────────────────────── */}
      <div className="space-y-1.5">

        {/* ── SPIRITUAL ── */}
        <AccordionCard
          pillarKey="s" pillar={PILLARS.spirit} pct={sPct}
          streak={streaks.spiritual} open={openPillar === 's'}
          onToggle={() => togglePillar('s')}
          onLog={e => handlePillarLog('s', e)}
        >
          {goals.spiritual.filter(g => g.included).length === 0
            ? <p className="text-xs opacity-60 italic">No goals set</p>
            : goals.spiritual.filter(g => g.included).map(g => {
                if (g.goalType === 'tiered') {
                  const sel = viewedEntry?.tiered_selections?.[g.id]
                  return <CheckRow key={g.id} done={!!(sel && sel.trim())} label={sel ? `${displayName(g)} — ${sel}` : displayName(g)} />
                }
                return <CheckRow key={g.id} done={!!viewedEntry?.spiritual?.[g.id]} label={displayName(g)} />
              })
          }
        </AccordionCard>

        {/* ── PHYSICAL ── */}
        <AccordionCard
          pillarKey="p" pillar={PILLARS.physi} pct={pPct}
          streak={streaks.physical} open={openPillar === 'p'}
          onToggle={() => togglePillar('p')}
          onLog={e => handlePillarLog('p', e)}
        >
          {goals.physical.filter(g => g.included).length === 0 && exMin === 0
            ? <p className="text-xs opacity-60 italic">No goals set</p>
            : <>
                {goals.physical.filter(g => g.included).map(g => {
                  const acts = viewedEntry?.activities ?? []
                  let done = false
                  if ((CATEGORIZED_PHYSICAL_IDS as readonly string[]).includes(g.id)) {
                    if (g.id === 'stretching') {
                      done = acts.some(a => a.category === 'Stretching' && (a.duration || 0) > 0)
                    } else {
                      const subs = g.subTypes ?? []
                      done = subs.length > 0
                        ? acts.some(a => subs.includes(a.category ?? '') && (a.duration || 0) > 0)
                        : totalMinutes(acts) > 0
                    }
                  } else if (g.goalType === 'tiered') {
                    const sel = viewedEntry?.tiered_selections?.[g.id]
                    done = !!(sel && sel.trim())
                    return <CheckRow key={g.id} done={done} label={sel ? `${displayName(g)} — ${sel}` : displayName(g)} />
                  } else {
                    done = !!viewedEntry?.physical_goals?.[g.id]
                  }
                  return <CheckRow key={g.id} done={done} label={displayName(g)} />
                })}
                {!goals.physical.find(g => g.id === 'exercise_training' && g.included) && (
                  <CheckRow done={exMin > 0} label={`Exercise Logged${exMin > 0 ? ` — ${exMin} min` : ''}`} />
                )}
                <CheckRow done={!!viewedEntry?.sleep}  label="Sleep Logged" />
                <CheckRow done={!!viewedEntry?.weight} label="Weight Logged" />
              </>
          }
        </AccordionCard>

        {/* ── NUTRITIONAL ── */}
        <AccordionCard
          pillarKey="n" pillar={PILLARS.nutri} pct={nPct}
          streak={streaks.nutritional} open={openPillar === 'n'}
          onToggle={() => togglePillar('n')}
          onLog={e => handlePillarLog('n', e)}
        >
          {goals.nutritional.length === 0
            ? <p className="text-xs opacity-60 italic">No goals set</p>
            : goals.nutritional.map(id => {
                let done = false
                if (id === 'track_calories') {
                  const log = viewedEntry?.nutritional_log ?? {}
                  done = Object.values(log).some(v => v != null && Number(v) > 0)
                } else {
                  done = !!viewedEntry?.nutritional?.[id]
                }
                const label = NUTRI_OPTIONS.find(o => o.id === id)?.label ?? id
                return <CheckRow key={id} done={done} label={label} />
              })
          }
        </AccordionCard>

        {/* ── PERSONAL ── */}
        <AccordionCard
          pillarKey="pe" pillar={PILLARS.perso} pct={pePct}
          streak={streaks.personal} open={openPillar === 'pe'}
          onToggle={() => togglePillar('pe')}
          onLog={e => handlePillarLog('pe', e)}
        >
          {goals.personal.filter(g => g.included).length === 0
            ? <p className="text-xs opacity-60 italic">No goals set</p>
            : goals.personal.filter(g => g.included).map(g => {
                if (g.goalType === 'tiered') {
                  const sel = viewedEntry?.tiered_selections?.[g.id]
                  return <CheckRow key={g.id} done={!!(sel && sel.trim())} label={sel ? `${displayName(g)} — ${sel}` : displayName(g)} />
                }
                return <CheckRow key={g.id} done={!!viewedEntry?.personal?.[g.id]} label={displayName(g)} />
              })
          }
        </AccordionCard>

      </div>
    </div>
  )
}

// ── Accordion card component ──────────────────────────────────────────────────
type PillarDef = { bg: string; lt: string; border: string; icon: string; label: string }

function AccordionCard({
  pillar, pct, streak, open, onToggle, onLog, children,
}: {
  pillarKey: string
  pillar:    PillarDef
  pct:       number
  streak:    number
  open:      boolean
  onToggle:  () => void
  onLog:     (e: React.MouseEvent) => void
  children:  React.ReactNode
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{ background: pillar.bg, borderColor: pillar.border }}
    >
      {/* Card header — always visible, tap to toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
      >
        {/* Icon + label + streak */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="relative flex-shrink-0 w-5 h-5">
              <Image src={pillar.icon} alt="" fill className="object-contain" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: pillar.lt }}>
              {pillar.label}
            </span>
          </div>
          <StreakBadge count={streak} color={pillar.lt} />
        </div>

        {/* Ring */}
        <Dial pct={pct} color={pct === 100 ? '#4ade80' : pillar.lt} size={46} />

        {/* Log button */}
        <button
          onClick={onLog}
          className="px-3 py-1.5 rounded-lg text-xs font-black text-white transition-opacity hover:opacity-80 active:scale-95 flex-shrink-0"
          style={{ background: pillar.lt + '33', border: `1px solid ${pillar.lt}66`, color: pillar.lt }}
        >
          Log
        </button>

        {/* Chevron */}
        <span style={{ color: pillar.lt + 'aa' }}>
          <Chevron open={open} />
        </span>
      </button>

      {/* Expanded goal list */}
      {open && (
        <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: pillar.border }}>
          {children}
        </div>
      )}
    </div>
  )
}
