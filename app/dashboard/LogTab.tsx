'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { saveEntry } from '@/app/actions'
import {
  NUTRI_OPTIONS, CATEGORIZED_PHYSICAL_IDS, displayName, todayStr, emptyEntry, totalMinutes,
  type UserGoals, type DailyEntry, type PhysicalActivity, type NutritionalLog,
} from '@/lib/constants'
import { SPIRIT, PHYSI, NUTRI, PERSO } from '@/lib/brand'

type Pillar = 's' | 'p' | 'n' | 'pe'

type Props = {
  goals:          UserGoals
  todayEntry:     DailyEntry | null
  history:        DailyEntry[]
  initialDate?:   string
  initialPillar?: Pillar
  onSaved:        (entry: DailyEntry) => void
}

function MiniRing({ pct, color }: { pct: number; color: string }) {
  const size = 28, r = 11, cx = 14, cy = 14
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={pct === 100 ? '#4ade80' : color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 14 14)" style={{ transition: 'stroke-dasharray 0.4s ease' }} />
    </svg>
  )
}

const PILLAR_UI = {
  s:  { label: 'Spiritual',   icon: '/Spiritual_Icon_Bk.png',   accent: SPIRIT.light, bg: SPIRIT.dark, border: SPIRIT.border, sectionTitle: 'Spiritual disciplines', next: 'Physical'    },
  p:  { label: 'Physical',    icon: '/Physical_Icon_Bk.png',    accent: PHYSI.light,  bg: PHYSI.dark,  border: PHYSI.border,  sectionTitle: 'Physical goals',         next: 'Nutritional' },
  n:  { label: 'Nutritional', icon: '/Nutritional_Icon_Bk.png', accent: NUTRI.light,  bg: NUTRI.dark,  border: NUTRI.border,  sectionTitle: 'Nutritional goals',      next: 'Personal'    },
  pe: { label: 'Personal',    icon: '/Personal_Icon_Bk.png',    accent: PERSO.light,  bg: PERSO.dark,  border: PERSO.border,  sectionTitle: 'Personal development',   next: null          },
} as const

const PILLAR_ORDER: Pillar[] = ['s', 'p', 'n', 'pe']

function initFromEntry(entry: DailyEntry | null, date: string) {
  const e = entry ?? emptyEntry(date)
  return {
    spiritual:        e.spiritual,
    physicalGoals:    e.physical_goals,
    activities:       e.activities,
    sleep:            e.sleep?.toString()  ?? '',
    weight:           e.weight?.toString() ?? '',
    bp:               e.blood_pressure     ?? '',
    nutri:            e.nutritional     as Record<string, boolean>,
    nutriLog:         e.nutritional_log ?? {} as NutritionalLog,
    personal:         e.personal,
    tieredSelections: e.tiered_selections ?? {} as Record<string, string>,
  }
}

export default function LogTab({ goals, todayEntry, history, initialDate, initialPillar, onSaved }: Props) {
  const [isPending, startTransition]    = useTransition()
  const [toast, setToast]               = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(initialDate ?? todayStr())

  const activeEntry =
    selectedDate === todayStr()
      ? todayEntry
      : history.find(e => e.entry_date === selectedDate) ?? null

  const init = initFromEntry(activeEntry, selectedDate)

  const [spiritual,     setSpiritual]     = useState(init.spiritual)
  const [physicalGoals, setPhysicalGoals] = useState(init.physicalGoals)
  const [activities,    setActivities]    = useState<PhysicalActivity[]>(init.activities)
  const [sleep,   setSleep]   = useState(init.sleep)
  const [weight,  setWeight]  = useState(init.weight)
  const [bp,      setBp]      = useState(init.bp)
  const [nutri,            setNutri]            = useState<Record<string, boolean>>(init.nutri)
  const [nutriLog,         setNutriLog]         = useState<NutritionalLog>(init.nutriLog)
  const [personal,         setPersonal]         = useState(init.personal)
  const [tieredSelections, setTieredSelections] = useState<Record<string, string>>(init.tieredSelections)
  const [calorieOpen,      setCalorieOpen]      = useState(() => {
    const log = init.nutriLog
    return Object.values(log).some(v => v != null && Number(v) > 0)
  })

  // Active pillars (have goals configured)
  const activePillars: Pillar[] = [
    ...(goals.spiritual.some(g => g.included) ? ['s' as Pillar] : []),
    ...(goals.physical.some(g => g.included) ? ['p' as Pillar] : []),
    ...(goals.nutritional.length > 0 ? ['n' as Pillar] : []),
    ...(goals.personal.some(g => g.included) ? ['pe' as Pillar] : []),
  ]

  // Compute default pillar from init data (only consider active pillars)
  function computeDefaultPillar(): Pillar {
    if (activePillars.includes('s')) {
      const si = goals.spiritual.filter(g => g.included)
      if (si.some(g => g.goalType === 'tiered' ? !init.tieredSelections[g.id]?.trim() : !init.spiritual[g.id])) return 's'
    }
    if (activePillars.includes('p')) {
      const pi = goals.physical.filter(g => g.included)
      if (pi.length > 0 && init.activities.length === 0) return 'p'
    }
    if (activePillars.includes('n')) {
      const ni = goals.nutritional
      if (ni.some(id => id === 'track_calories'
        ? !Object.values(init.nutriLog).some(v => v != null && Number(v) > 0)
        : !init.nutri[id])) return 'n'
    }
    if (activePillars.includes('pe')) {
      const pei = goals.personal.filter(g => g.included)
      if (pei.some(g => g.goalType === 'tiered' ? !init.tieredSelections[g.id]?.trim() : !init.personal[g.id])) return 'pe'
    }
    return activePillars[0] ?? 's'
  }

  const [pillar, setPillar] = useState<Pillar>(initialPillar ?? computeDefaultPillar())

  useEffect(() => {
    const entry =
      selectedDate === todayStr()
        ? todayEntry
        : history.find(e => e.entry_date === selectedDate) ?? null
    const i = initFromEntry(entry, selectedDate)
    setSpiritual(i.spiritual)
    setPhysicalGoals(i.physicalGoals)
    setActivities(i.activities)
    setSleep(i.sleep)
    setWeight(i.weight)
    setBp(i.bp)
    setNutri(i.nutri)
    setNutriLog(i.nutriLog)
    setPersonal(i.personal)
    setTieredSelections(i.tieredSelections)
    setCalorieOpen(Object.values(i.nutriLog).some(v => v != null && Number(v) > 0))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, todayEntry, history])

  // ── Activity helpers ────────────────────────────────────────────────────────
  function getForCategory(cat: string) {
    return activities
      .map((a, idx) => ({ ...a, idx }))
      .filter(a => (a.category ?? '') === cat)
  }
  function addToCategory(cat: string) {
    setActivities(prev => [...prev, { category: cat, type: '', duration: 0 }])
  }
  function updateActivity(idx: number, field: keyof PhysicalActivity, val: string | number) {
    setActivities(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a))
  }
  function removeActivity(idx: number) {
    setActivities(prev => prev.filter((_, i) => i !== idx))
  }
  function catTotal(cat: string) {
    return getForCategory(cat).reduce((s, a) => s + (Number(a.duration) || 0), 0)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  function handleSave() {
    const hasCalorieLog = Object.values(nutriLog).some(v => v != null && Number(v) > 0)
    const entry: DailyEntry = {
      entry_date:        selectedDate,
      spiritual,
      physical_goals:    physicalGoals,
      activities:        activities.filter(a => a.type || a.duration),
      sleep:             sleep  ? parseFloat(sleep)  : null,
      weight:            weight ? parseFloat(weight) : null,
      blood_pressure:    bp || null,
      nutritional: {
        ...nutri,
        ...(goals.nutritional.includes('track_calories') ? { track_calories: hasCalorieLog } : {}),
      },
      nutritional_log:   nutriLog,
      personal,
      tiered_selections: tieredSelections,
    }
    startTransition(async () => {
      try {
        await saveEntry(entry)
        onSaved(entry)
        showToast(`Entry saved for ${fmtDate(selectedDate)} ✓`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast(`❌ Save failed: ${msg}`)
      }
    })
  }

  function handleSaveAndContinue() {
    handleSave()
    const idx = activePillars.indexOf(pillar)
    if (idx < activePillars.length - 1) setPillar(activePillars[idx + 1])
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }
  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isToday    = selectedDate === todayStr()
  const isBackfill = !isToday
  const inputCls   = 'w-full px-3 py-2 bg-dct-bg border border-dct-border rounded-lg text-dct-text text-sm outline-none focus:border-spirit transition-colors'

  // Physical goal references
  const exerciseGoal      = goals.physical.find(g => g.id === 'exercise_training')
  const stretchGoal       = goals.physical.find(g => g.id === 'stretching')
  const binaryGoals       = goals.physical.filter(g => g.included && g.id !== 'exercise_training' && g.id !== 'stretching')

  // ── Completion helpers ──────────────────────────────────────────────────────
  function spirPct(): number {
    const included = goals.spiritual.filter(g => g.included)
    if (included.length === 0) return 100
    const done = included.filter(g =>
      g.goalType === 'tiered'
        ? !!tieredSelections[g.id]?.trim()
        : !!spiritual[g.id]
    ).length
    return Math.round((done / included.length) * 100)
  }

  function spirStatus(): string {
    const included = goals.spiritual.filter(g => g.included)
    const done = included.filter(g =>
      g.goalType === 'tiered'
        ? !!tieredSelections[g.id]?.trim()
        : !!spiritual[g.id]
    ).length
    return `${done} of ${included.length} done`
  }

  function physPct(): number {
    let total = 0
    let done  = 0

    // physical goals (binary + tiered)
    const allPhysGoals = goals.physical.filter(g => g.included)
    for (const g of allPhysGoals) {
      total++
      if (g.goalType === 'tiered') {
        if (tieredSelections[g.id]?.trim()) done++
      } else if (g.id === 'weight_goal') {
        if (weight && parseFloat(weight) > 0) done++
      } else if (g.id === 'blood_pressure') {
        if (bp) done++
      } else {
        if (physicalGoals[g.id]) done++
      }
    }

    if (total === 0) return 100
    return Math.round((done / total) * 100)
  }

  function physStatus(): string {
    let total = 0
    let done  = 0

    const allPhysGoals = goals.physical.filter(g => g.included)
    for (const g of allPhysGoals) {
      total++
      if (g.goalType === 'tiered') {
        if (tieredSelections[g.id]?.trim()) done++
      } else if (g.id === 'weight_goal') {
        if (weight && parseFloat(weight) > 0) done++
      } else if (g.id === 'blood_pressure') {
        if (bp) done++
      } else {
        if (physicalGoals[g.id]) done++
      }
    }

    return `${done} of ${total} done`
  }

  function nutriPct(): number {
    const ids = goals.nutritional
    if (ids.length === 0) return 100
    const done = ids.filter(id => {
      if (id === 'track_calories') {
        return Object.values(nutriLog).some(v => v != null && Number(v) > 0)
      }
      return !!nutri[id]
    }).length
    return Math.round((done / ids.length) * 100)
  }

  function nutriStatus(): string {
    const ids = goals.nutritional
    const done = ids.filter(id => {
      if (id === 'track_calories') {
        return Object.values(nutriLog).some(v => v != null && Number(v) > 0)
      }
      return !!nutri[id]
    }).length
    return `${done} of ${ids.length} done`
  }

  function persoPct(): number {
    const included = goals.personal.filter(g => g.included)
    if (included.length === 0) return 100
    const done = included.filter(g =>
      g.goalType === 'tiered'
        ? !!tieredSelections[g.id]?.trim()
        : !!personal[g.id]
    ).length
    return Math.round((done / included.length) * 100)
  }

  function persoStatus(): string {
    const included = goals.personal.filter(g => g.included)
    const done = included.filter(g =>
      g.goalType === 'tiered'
        ? !!tieredSelections[g.id]?.trim()
        : !!personal[g.id]
    ).length
    return `${done} of ${included.length} done`
  }

  // Pillar grid config — only include active pillars
  const allPillarData: { id: Pillar; pct: number; status: string }[] = [
    { id: 's',  pct: spirPct(),  status: spirStatus()  },
    { id: 'p',  pct: physPct(),  status: physStatus()  },
    { id: 'n',  pct: nutriPct(), status: nutriStatus() },
    { id: 'pe', pct: persoPct(), status: persoStatus() },
  ]
  const pillars = allPillarData.filter(p => activePillars.includes(p.id))

  const ui = PILLAR_UI[pillar]
  const currentActivePillarIdx = activePillars.indexOf(pillar)
  const nextActivePillar = currentActivePillarIdx < activePillars.length - 1
    ? activePillars[currentActivePillarIdx + 1]
    : null
  const nextPillarLabel = nextActivePillar ? PILLAR_UI[nextActivePillar].label : null
  const isLastActivePillar = nextActivePillar === null

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black whitespace-nowrap">Check In</h2>

        {/* Date pill with hidden input overlay */}
        <label className="relative flex items-center gap-2 px-3 py-2 bg-dct-surface border border-dct-border rounded-xl cursor-pointer hover:border-spirit transition-colors group flex-shrink-0">
          <div
            className="flex flex-col items-center justify-center w-7 h-7 rounded flex-shrink-0"
            style={{ background: SPIRIT.primary }}>
            <span className="text-[9px] font-bold uppercase leading-none text-white">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-sm font-black leading-none text-white">
              {new Date(selectedDate + 'T00:00:00').getDate()}
            </span>
          </div>
          <span className="text-sm font-bold text-dct-text whitespace-nowrap">
            {isToday ? `Today · ${fmtDate(selectedDate)}` : fmtDate(selectedDate)}
          </span>
          {isBackfill && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-nutri/20 text-nutri-lt border border-nutri/30 ml-1">
              past
            </span>
          )}
          <span className="text-[10px] text-dct-muted group-hover:text-spirit-lt transition-colors">▼</span>
          <input
            type="date"
            max={todayStr()}
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setPillar('s') }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ colorScheme: 'dark' }}
          />
        </label>
      </div>

      {/* Backfill notices */}
      {isBackfill && activeEntry && (
        <div className="flex items-center gap-2 px-3 py-2 bg-spirit/10 border border-spirit/30 rounded-lg text-xs text-spirit-lt">
          <span>📋</span><span>You have an existing entry for {fmtDate(selectedDate)} — your changes will update it.</span>
        </div>
      )}
      {isBackfill && !activeEntry && (
        <div className="flex items-center gap-2 px-3 py-2 bg-dct-surface2 border border-dct-border rounded-lg text-xs text-dct-muted">
          <span>📭</span><span>No entry exists for {fmtDate(selectedDate)} — this will create a new one.</span>
        </div>
      )}

      {/* 2×2 Pillar grid */}
      <div className="grid grid-cols-2 gap-2">
        {pillars.map(({ id, pct, status }) => {
          const p = PILLAR_UI[id]
          const isActive = pillar === id
          return (
            <button
              key={id}
              onClick={() => setPillar(id)}
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-all text-left"
              style={{
                background:   p.bg,
                border:       isActive ? `2px solid ${p.accent}` : '2px solid transparent',
                opacity:      isActive ? 1 : 0.5,
              }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative w-5 h-5 flex-shrink-0">
                  <Image src={p.icon} alt="" fill className="object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wide" style={{ color: p.accent }}>
                    {p.label}
                  </div>
                  <div className="text-[10px] text-white/60 leading-tight truncate">{status}</div>
                </div>
              </div>
              <MiniRing pct={pct} color={p.accent} />
            </button>
          )
        })}
      </div>

      {/* ── Content panel ── */}
      <div className="rounded-xl border p-4 space-y-4" style={{ background: ui.bg, borderColor: ui.border }}>

        {/* Panel header */}
        <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: ui.border }}>
          <div className="relative w-5 h-5 flex-shrink-0">
            <Image src={ui.icon} alt="" fill className="object-contain" />
          </div>
          <span className="text-sm font-black" style={{ color: ui.accent }}>{ui.sectionTitle}</span>
        </div>

        {/* ── Spiritual form ── */}
        {pillar === 's' && (
          <div className="space-y-2">
            {goals.spiritual.filter(g => g.included).length === 0
              ? <p className="text-dct-muted text-sm italic">No spiritual goals configured. Set them in ⚙️ Goals.</p>
              : goals.spiritual.filter(g => g.included).map(g => {
                if (g.goalType === 'tiered' && (g.tiers ?? []).length > 0) {
                  const sel = tieredSelections[g.id] ?? ''
                  return (
                    <div key={g.id} className="bg-dct-surface2 rounded-lg border border-dct-border p-3 space-y-2">
                      <div className="text-sm font-semibold">{displayName(g)}</div>
                      <div className="text-xs text-dct-muted">Select the level you achieved:</div>
                      <div className="space-y-1.5">
                        {(g.tiers ?? []).map(tier => (
                          <label key={tier} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${sel === tier ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border bg-dct-surface'}`}>
                            <input type="radio" name={`tier-${g.id}`} className="chk-spirit w-4 h-4"
                              checked={sel === tier}
                              onChange={() => setTieredSelections(s => ({ ...s, [g.id]: tier }))} />
                            <span className="text-sm">{tier}</span>
                          </label>
                        ))}
                      </div>
                      {sel && (
                        <button type="button" onClick={() => setTieredSelections(s => ({ ...s, [g.id]: '' }))}
                          className="text-[10px] text-dct-muted hover:text-red-400">✕ Clear selection</button>
                      )}
                    </div>
                  )
                }
                return (
                  <label key={g.id}
                    className={`flex items-center gap-3 p-3 bg-dct-surface2 rounded-lg border-2 cursor-pointer transition-all ${spiritual[g.id] ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border'}`}>
                    <input type="checkbox" className="chk-spirit w-4 h-4" checked={!!spiritual[g.id]}
                      onChange={e => setSpiritual(s => ({ ...s, [g.id]: e.target.checked }))} />
                    <span className="text-sm font-semibold">{displayName(g)}</span>
                  </label>
                )
              })
            }
          </div>
        )}

        {/* ── Physical form ── */}
        {pillar === 'p' && (
          <div className="space-y-4">
            {/* Binary physical goals (steps, sleep_goal, etc.) */}
            {binaryGoals.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-physi-lt uppercase tracking-wider">Daily Goals — Did you hit them?</div>
                {binaryGoals.map(g => {
                  if (g.goalType === 'tiered' && (g.tiers ?? []).length > 0) {
                    const sel = tieredSelections[g.id] ?? ''
                    return (
                      <div key={g.id} className="bg-dct-surface2 rounded-lg border border-dct-border p-3 space-y-2">
                        <div className="text-sm font-semibold">{displayName(g)}</div>
                        <div className="text-xs text-dct-muted">Select the level you achieved:</div>
                        <div className="space-y-1.5">
                          {(g.tiers ?? []).map(tier => (
                            <label key={tier} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${sel === tier ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border bg-dct-surface'}`}>
                              <input type="radio" name={`tier-${g.id}`} className="chk-physi w-4 h-4"
                                checked={sel === tier}
                                onChange={() => setTieredSelections(s => ({ ...s, [g.id]: tier }))} />
                              <span className="text-sm">{tier}</span>
                            </label>
                          ))}
                        </div>
                        {sel && (
                          <button type="button" onClick={() => setTieredSelections(s => ({ ...s, [g.id]: '' }))}
                            className="text-[10px] text-dct-muted hover:text-red-400">✕ Clear selection</button>
                        )}
                      </div>
                    )
                  }
                  if (g.id === 'sleep_goal') {
                    return (
                      <div key={g.id}
                        className={`flex items-center gap-3 p-3 bg-dct-surface2 rounded-lg border-2 transition-all ${physicalGoals[g.id] ? 'border-dct-success bg-dct-success/10' : 'border-dct-border'}`}>
                        <input type="checkbox" className="chk-physi w-4 h-4 flex-shrink-0" checked={!!physicalGoals[g.id]}
                          onChange={e => setPhysicalGoals(pg => ({ ...pg, [g.id]: e.target.checked }))} />
                        <span className="text-sm font-semibold flex-1">{displayName(g)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dct-muted whitespace-nowrap">Hours slept:</span>
                          <input
                            className="w-20 px-2 py-1 bg-dct-bg border border-dct-border rounded-lg text-dct-text text-sm outline-none focus:border-physi transition-colors"
                            type="number" step="0.5" min={0} max={24} placeholder="7.5"
                            value={sleep}
                            onChange={e => setSleep(e.target.value)} />
                        </div>
                      </div>
                    )
                  }
                  if (g.id === 'weight_goal') {
                    return (
                      <div key={g.id}
                        className={`flex items-center gap-3 p-3 bg-dct-surface2 rounded-lg border-2 transition-all ${weight && parseFloat(weight) > 0 ? 'border-dct-success bg-dct-success/10' : 'border-dct-border'}`}>
                        <span className="text-sm font-semibold flex-1">{displayName(g)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-dct-muted whitespace-nowrap">lbs:</span>
                          <input
                            className="w-20 px-2 py-1 bg-dct-bg border border-dct-border rounded-lg text-dct-text text-sm outline-none focus:border-physi transition-colors"
                            type="number" step="0.1" placeholder="175.0"
                            value={weight}
                            onChange={e => setWeight(e.target.value)} />
                        </div>
                      </div>
                    )
                  }
                  return (
                    <label key={g.id}
                      className={`flex items-center gap-3 p-3 bg-dct-surface2 rounded-lg border-2 cursor-pointer transition-all ${physicalGoals[g.id] ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border'}`}>
                      <input type="checkbox" className="chk-physi w-4 h-4" checked={!!physicalGoals[g.id]}
                        onChange={e => setPhysicalGoals(pg => ({ ...pg, [g.id]: e.target.checked }))} />
                      <span className="text-sm font-semibold">{displayName(g)}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {/* Exercise Training */}
            {(() => {
              const configuredExSubs = exerciseGoal?.included ? (exerciseGoal.subTypes ?? []) : []
              const ST_CAT = 'Stretching'
              const savedExCats = [...new Set(
                activities.filter(a => a.category && a.category !== ST_CAT).map(a => a.category)
              )]
              const allExCats = [...new Set([...configuredExSubs, ...savedExCats])]
              const exMinutes = totalMinutes(activities.filter(a => a.category !== ST_CAT))
              return (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-physi-lt uppercase tracking-wider flex items-center justify-between">
                    <span>Exercise Training</span>
                    {exMinutes > 0 && (
                      <span className="text-physi-lt font-black">{exMinutes} min total</span>
                    )}
                  </div>
                  {allExCats.length === 0 && (
                    <div className="bg-dct-surface2 rounded-lg border border-dct-border p-3">
                      <p className="text-xs text-dct-muted italic mb-2">
                        Configure exercise categories in ⚙️ Goals → Exercise Training to log by type.
                      </p>
                      <button onClick={() => addToCategory('General')} className="text-xs text-physi-lt hover:opacity-80">
                        + Log general exercise
                      </button>
                    </div>
                  )}
                  {allExCats.map(cat => {
                    const items = getForCategory(cat)
                    const total = catTotal(cat)
                    return (
                      <div key={cat} className="bg-dct-surface2 rounded-lg border border-dct-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-black text-physi-lt">{cat}</div>
                          {total > 0 && <div className="text-xs text-physi-lt font-black">{total} min</div>}
                        </div>
                        {items.map(({ idx, ...act }) => (
                          <div key={idx} className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <select className={inputCls} value={act.type} onChange={e => updateActivity(idx, 'type', e.target.value)}>
                                <option value="">Select exercise...</option>
                                {goals.exerciseTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                {act.type && !goals.exerciseTypes.includes(act.type) && act.type !== 'Other' && (
                                  <option value={act.type}>{act.type}</option>
                                )}
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="flex gap-1">
                              <input className={inputCls} type="number" placeholder="min" min={0}
                                value={act.duration || ''} onChange={e => updateActivity(idx, 'duration', parseInt(e.target.value) || 0)} />
                              <button onClick={() => removeActivity(idx)} className="text-dct-muted hover:text-red-400 text-xs px-1 hover:opacity-80">✕</button>
                            </div>
                          </div>
                        ))}
                        <button onClick={() => addToCategory(cat)} className="text-xs text-physi-lt hover:opacity-80">
                          + Add exercise
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* Stretching */}
            {stretchGoal?.included && (() => {
              const ST_CAT = 'Stretching'
              const stItems = activities
                .map((a, idx) => ({ ...a, idx }))
                .filter(a => a.category === ST_CAT)
              const total = stItems.reduce((s, a) => s + (Number(a.duration) || 0), 0)
              return (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-physi-lt uppercase tracking-wider flex items-center justify-between">
                    <span>Stretching / Mobility</span>
                    {total > 0 && <span className="font-black">{total} min total</span>}
                  </div>
                  {stretchGoal.customName && (
                    <p className="text-xs text-dct-muted italic">{stretchGoal.customName}</p>
                  )}
                  <div className="bg-dct-surface2 rounded-lg border border-dct-border p-3 space-y-2">
                    {stItems.map(({ idx, ...act }) => (
                      <div key={idx} className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <select className={inputCls} value={act.type} onChange={e => updateActivity(idx, 'type', e.target.value)}>
                            <option value="">Select stretch...</option>
                            {goals.stretchingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            {act.type && !goals.stretchingTypes.includes(act.type) && act.type !== 'Other' && (
                              <option value={act.type}>{act.type}</option>
                            )}
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="flex gap-1">
                          <input className={inputCls} type="number" placeholder="min" min={0}
                            value={act.duration || ''} onChange={e => updateActivity(idx, 'duration', parseInt(e.target.value) || 0)} />
                          <button onClick={() => removeActivity(idx)} className="text-dct-muted hover:text-red-400 text-xs px-1 hover:opacity-80">✕</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addToCategory(ST_CAT)} className="text-xs text-physi-lt hover:opacity-80">
                      + Add stretch
                    </button>
                  </div>
                </div>
              )
            })()}

            {goals.physical.find(g => g.id === 'weight_goal' && g.included) && (
              <div className="space-y-1">
                <div className="text-xs font-bold text-physi-lt uppercase tracking-wider">Weight (lbs)</div>
                <input className={inputCls} type="number" step="0.1" placeholder="175.0"
                  value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
            )}
            {goals.physical.find(g => g.id === 'blood_pressure' && g.included) && (
              <div className="space-y-1">
                <div className="text-xs font-bold text-physi-lt uppercase tracking-wider">Blood Pressure</div>
                <input className={inputCls} placeholder="e.g. 120/80"
                  value={bp} onChange={e => setBp(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {/* ── Nutritional form ── */}
        {pillar === 'n' && (
          <div className="space-y-3">
            {goals.nutritional.length === 0 ? (
              <p className="text-dct-muted text-sm italic">No nutritional items selected. Set them in ⚙️ Goals.</p>
            ) : (
              <div className="space-y-2">
                {goals.nutritional.map(id => {
                  if (id === 'track_calories') {
                    const hasData = Object.values(nutriLog).some(v => v != null && Number(v) > 0)
                    return (
                      <div key={id} className={`bg-dct-surface2 rounded-lg border-2 overflow-hidden transition-all ${hasData || calorieOpen ? 'border-dct-success' : 'border-transparent hover:border-dct-border'}`}>
                        <button
                          type="button"
                          onClick={() => setCalorieOpen(o => !o)}
                          className="w-full flex items-center gap-3 p-3 text-left">
                          <span className="text-lg">{calorieOpen ? '▾' : '▸'}</span>
                          <span className="text-sm font-semibold flex-1">Track Calories</span>
                          {hasData && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-dct-success/20 text-green-400">
                              {nutriLog.calories != null ? `${nutriLog.calories} kcal` : 'Logged ✓'}
                            </span>
                          )}
                        </button>
                        {calorieOpen && (
                          <div className="px-3 pb-3 grid grid-cols-2 gap-3">
                            {([
                              { key: 'calories', label: 'Calories'    },
                              { key: 'protein',  label: 'Protein (g)' },
                              { key: 'carbs',    label: 'Carbs (g)'   },
                              { key: 'fat',      label: 'Fat (g)'     },
                              { key: 'fiber',    label: 'Fiber (g)'   },
                            ] as { key: keyof NutritionalLog; label: string }[]).map(({ key, label }) => (
                              <div key={key}>
                                <label className="block text-xs font-bold text-dct-muted uppercase tracking-wider mb-1">{label}</label>
                                <input className={inputCls} type="number" min={0} placeholder="0"
                                  value={nutriLog[key] ?? ''}
                                  onChange={e => {
                                    const val = e.target.value === '' ? undefined : parseInt(e.target.value) || 0
                                    setNutriLog(l => ({ ...l, [key]: val }))
                                  }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  const opt = NUTRI_OPTIONS.find(o => o.id === id)
                  return (
                    <label key={id}
                      className={`flex items-center gap-3 p-3 bg-dct-surface2 rounded-lg border-2 cursor-pointer transition-all ${nutri[id] ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border'}`}>
                      <input type="checkbox" className="chk-nutri w-4 h-4" checked={!!nutri[id]}
                        onChange={e => setNutri(n => ({ ...n, [id]: e.target.checked }))} />
                      <span className="text-sm font-semibold">{opt?.label ?? id}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Personal form ── */}
        {pillar === 'pe' && (
          <div className="space-y-2">
            {goals.personal.filter(g => g.included).length === 0
              ? <p className="text-dct-muted text-sm italic">No personal goals configured. Set them in ⚙️ Goals.</p>
              : goals.personal.filter(g => g.included).map(g => {
                if (g.goalType === 'tiered' && (g.tiers ?? []).length > 0) {
                  const sel = tieredSelections[g.id] ?? ''
                  return (
                    <div key={g.id} className="bg-dct-surface2 rounded-lg border border-dct-border p-3 space-y-2">
                      <div className="text-sm font-semibold">{displayName(g)}</div>
                      <div className="text-xs text-dct-muted">Select the level you achieved:</div>
                      <div className="space-y-1.5">
                        {(g.tiers ?? []).map(tier => (
                          <label key={tier} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${sel === tier ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border bg-dct-surface'}`}>
                            <input type="radio" name={`tier-${g.id}`} className="chk-perso w-4 h-4"
                              checked={sel === tier}
                              onChange={() => setTieredSelections(s => ({ ...s, [g.id]: tier }))} />
                            <span className="text-sm">{tier}</span>
                          </label>
                        ))}
                      </div>
                      {sel && (
                        <button type="button" onClick={() => setTieredSelections(s => ({ ...s, [g.id]: '' }))}
                          className="text-[10px] text-dct-muted hover:text-red-400">✕ Clear selection</button>
                      )}
                    </div>
                  )
                }
                return (
                  <label key={g.id}
                    className={`flex items-center gap-3 p-3 bg-dct-surface2 rounded-lg border-2 cursor-pointer transition-all ${personal[g.id] ? 'border-dct-success bg-dct-success/10' : 'border-transparent hover:border-dct-border'}`}>
                    <input type="checkbox" className="chk-perso w-4 h-4" checked={!!personal[g.id]}
                      onChange={e => setPersonal(p => ({ ...p, [g.id]: e.target.checked }))} />
                    <span className="text-sm font-semibold">{displayName(g)}</span>
                  </label>
                )
              })
            }
          </div>
        )}

        {/* Panel footer */}
        <div className="pt-2 space-y-2">
          {!isLastActivePillar && nextPillarLabel && (
            <div className="text-xs text-center" style={{ color: ui.accent + '88' }}>
              Next: {nextPillarLabel} →
            </div>
          )}
          <button
            onClick={isLastActivePillar ? handleSave : handleSaveAndContinue}
            disabled={isPending}
            className="w-full py-3 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-opacity"
            style={{ background: ui.accent + 'cc' }}>
            {isPending ? 'Saving…' : isLastActivePillar ? "Save today's entry" : "Save & continue →"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-dct-surface border border-dct-success text-dct-success px-5 py-2 rounded-lg font-bold text-sm shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
