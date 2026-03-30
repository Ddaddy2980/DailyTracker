'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import { saveUserGoals, saveUserConfig } from '@/app/actions'
import {
  SPIRIT_DEFS, PHYSICAL_DEFS, PERSONAL_DEFS, NUTRI_OPTIONS,
  CATEGORIZED_PHYSICAL_IDS, defaultGoals, getDayNumber,
  type UserGoals, type UserConfig, type PillarGoal,
} from '@/lib/constants'
import { EXERCISE_SUGGESTIONS } from '@/lib/goalCoaching'
import { SPIRIT, PHYSI, NUTRI, PERSO } from '@/lib/brand'

// ── Types ─────────────────────────────────────────────────────────────────────
type PillarKey = 'spiritual' | 'physical' | 'nutritional' | 'personal'
type DrawerKey = PillarKey | 'challenge' | null

type Props = {
  initialGoals:  UserGoals
  initialConfig: UserConfig
  onSaved:       (goals: UserGoals) => void
}

// ── Brand map ─────────────────────────────────────────────────────────────────
const PILLAR_UI: Record<PillarKey, { label: string; icon: string; accent: string; bg: string; border: string }> = {
  spiritual:   { label: 'Spiritual',   icon: '/Spiritual_Icon_Bk.png',   accent: SPIRIT.light, bg: SPIRIT.dark, border: SPIRIT.border },
  physical:    { label: 'Physical',    icon: '/Physical_Icon_Bk.png',    accent: PHYSI.light,  bg: PHYSI.dark,  border: PHYSI.border  },
  nutritional: { label: 'Nutritional', icon: '/Nutritional_Icon_Bk.png', accent: NUTRI.light,  bg: NUTRI.dark,  border: NUTRI.border  },
  personal:    { label: 'Personal',    icon: '/Personal_Icon_Bk.png',    accent: PERSO.light,  bg: PERSO.dark,  border: PERSO.border  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeGoals(g: UserGoals): UserGoals {
  const defs = defaultGoals()
  function merge(stored: PillarGoal[], defaults: PillarGoal[]): PillarGoal[] {
    if (!stored || stored.length === 0) return defaults
    return defaults.map(def => {
      const saved = stored.find(s => s.id === def.id)
      return saved ? { ...def, ...saved } : def
    })
  }
  return {
    ...g,
    spiritual: merge(g.spiritual, defs.spiritual),
    physical:  merge(g.physical,  defs.physical),
    personal:  merge(g.personal,  defs.personal),
  }
}

function fmtConfigDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Chevron({ open, color }: { open: boolean; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function GoalsTab({ initialGoals, initialConfig, onSaved }: Props) {
  const [isPending, startTransition] = useTransition()
  const [toast, setToast]   = useState<string | null>(null)
  const [goals, setGoals]   = useState<UserGoals>(normalizeGoals(initialGoals))
  const [config, setConfig] = useState<UserConfig>(initialConfig)

  const [openPillar, setOpenPillar] = useState<PillarKey | null>(null)
  const [drawer,     setDrawer]     = useState<DrawerKey>(null)

  // Name-pool input states
  const [exInput,  setExInput]  = useState('')
  const [stInput,  setStInput]  = useState('')
  const [showExSugg, setShowExSugg] = useState(false)

  // Sub-type / tier inputs keyed by goal id
  const [subTypeInputs, setSubTypeInputs] = useState<Record<string, string>>({})
  const [tierInputs,    setTierInputs]    = useState<Record<string, string>>({})

  // Duration preset
  const presets = ['21', '40', '60', '90']
  const [durationChoice, setDurationChoice] = useState<string>(
    presets.includes(String(initialConfig.duration)) ? String(initialConfig.duration) : 'other'
  )

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setGoals(normalizeGoals(initialGoals))
    setConfig(initialConfig)
  }, [initialGoals, initialConfig])

  // ── Mutation helpers ────────────────────────────────────────────────────────
  function togglePillar(pillar: 'spiritual' | 'physical' | 'personal', id: string, checked: boolean) {
    setGoals(g => ({ ...g, [pillar]: (g[pillar] as PillarGoal[]).map(p => p.id === id ? { ...p, included: checked } : p) }))
  }
  function setPillarName(pillar: 'spiritual' | 'physical' | 'personal', id: string, val: string) {
    setGoals(g => ({ ...g, [pillar]: (g[pillar] as PillarGoal[]).map(p => p.id === id ? { ...p, customName: val } : p) }))
  }
  function setGoalType(pillar: 'spiritual' | 'physical' | 'personal', id: string, type: 'standard' | 'tiered') {
    setGoals(g => ({ ...g, [pillar]: (g[pillar] as PillarGoal[]).map(p => p.id === id ? { ...p, goalType: type } : p) }))
  }
  function addTier(pillar: 'spiritual' | 'physical' | 'personal', id: string) {
    const val = (tierInputs[id] ?? '').trim()
    if (!val) return
    setGoals(g => ({ ...g, [pillar]: (g[pillar] as PillarGoal[]).map(p =>
      p.id === id && !(p.tiers ?? []).includes(val) ? { ...p, tiers: [...(p.tiers ?? []), val] } : p
    )}))
    setTierInputs(s => ({ ...s, [id]: '' }))
  }
  function removeTier(pillar: 'spiritual' | 'physical' | 'personal', id: string, tier: string) {
    setGoals(g => ({ ...g, [pillar]: (g[pillar] as PillarGoal[]).map(p =>
      p.id === id ? { ...p, tiers: (p.tiers ?? []).filter(t => t !== tier) } : p
    )}))
  }
  function addSubType(goalId: string) {
    const val = (subTypeInputs[goalId] ?? '').trim()
    if (!val) return
    setGoals(g => ({ ...g, physical: g.physical.map(p =>
      p.id === goalId && !(p.subTypes ?? []).includes(val) ? { ...p, subTypes: [...(p.subTypes ?? []), val] } : p
    )}))
    setSubTypeInputs(s => ({ ...s, [goalId]: '' }))
  }
  function removeSubType(goalId: string, val: string) {
    setGoals(g => ({ ...g, physical: g.physical.map(p =>
      p.id === goalId ? { ...p, subTypes: (p.subTypes ?? []).filter(t => t !== val) } : p
    )}))
  }
  function toggleNutri(id: string) {
    setGoals(g => ({ ...g, nutritional: g.nutritional.includes(id) ? g.nutritional.filter(n => n !== id) : [...g.nutritional, id] }))
  }
  function addExType(val?: string) {
    const v = (val ?? exInput).trim()
    if (!v || goals.exerciseTypes.includes(v)) return
    setGoals(g => ({ ...g, exerciseTypes: [...g.exerciseTypes, v] }))
    if (!val) setExInput('')
  }
  function removeExType(val: string) {
    setGoals(g => ({ ...g, exerciseTypes: g.exerciseTypes.filter(e => e !== val) }))
  }
  function addStType(val?: string) {
    const v = (val ?? stInput).trim()
    if (!v || goals.stretchingTypes.includes(v)) return
    setGoals(g => ({ ...g, stretchingTypes: [...g.stretchingTypes, v] }))
    if (!val) setStInput('')
  }
  function removeStType(val: string) {
    setGoals(g => ({ ...g, stretchingTypes: g.stretchingTypes.filter(s => s !== val) }))
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  function handleSave(andClose = false) {
    startTransition(async () => {
      try {
        await Promise.all([saveUserGoals(goals), saveUserConfig(config)])
        onSaved(goals)
        showToast('Goals saved ✓')
        if (andClose) setDrawer(null)
      } catch (err) {
        showToast(`❌ Save failed: ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const currentDay = getDayNumber(config.start_date)

  function goalCount(p: PillarKey): number {
    if (p === 'nutritional') return goals.nutritional.length
    if (p === 'spiritual')   return goals.spiritual.filter(g => g.included).length
    if (p === 'physical')    return goals.physical.filter(g => g.included).length
    return goals.personal.filter(g => g.included).length
  }

  const inputCls = 'w-full px-3 py-2 bg-dct-bg border border-dct-border rounded-lg text-dct-text text-sm outline-none focus:border-spirit transition-colors'

  return (
    <div className="space-y-3">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-dct-surface border border-dct-border rounded-xl text-sm font-bold shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">My Goals</h2>
        <button
          onClick={() => handleSave(false)}
          disabled={isPending}
          className="px-4 py-2 bg-dct-surface border border-dct-border rounded-xl text-sm font-black text-dct-text hover:bg-dct-surface2 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Challenge info strip ───────────────────────────────────────────── */}
      <div className="flex items-stretch bg-dct-surface border border-dct-border rounded-xl overflow-hidden">
        <div className="flex-1 px-3 py-2.5 text-center">
          <div className="text-[9px] text-dct-muted font-bold uppercase tracking-wider">Start Date</div>
          <div className="text-xs font-black text-dct-text mt-0.5">{fmtConfigDate(config.start_date)}</div>
        </div>
        <div className="w-px bg-dct-border self-stretch" />
        <div className="flex-1 px-3 py-2.5 text-center">
          <div className="text-[9px] text-dct-muted font-bold uppercase tracking-wider">Duration</div>
          <div className="text-xs font-black text-dct-text mt-0.5">{config.duration} days</div>
        </div>
        <div className="w-px bg-dct-border self-stretch" />
        <div className="flex-1 px-3 py-2.5 text-center">
          <div className="text-[9px] text-dct-muted font-bold uppercase tracking-wider">Day</div>
          <div className="text-xs font-black mt-0.5" style={{ color: NUTRI.light }}>{currentDay} of {config.duration}</div>
        </div>
        <div className="w-px bg-dct-border self-stretch" />
        <button
          onClick={() => setDrawer('challenge')}
          className="px-3 py-2.5 text-dct-muted hover:text-dct-text transition-colors"
          title="Edit challenge settings"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* ── Pillar accordion cards ─────────────────────────────────────────── */}
      {(['spiritual', 'physical', 'nutritional', 'personal'] as PillarKey[]).map(p => {
        const ui    = PILLAR_UI[p]
        const count = goalCount(p)
        const open  = openPillar === p

        return (
          <div key={p} className="rounded-xl border overflow-hidden" style={{ background: ui.bg, borderColor: ui.border }}>

            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="relative flex-shrink-0 w-5 h-5">
                <Image src={ui.icon} alt="" fill className="object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black uppercase tracking-wider" style={{ color: ui.accent }}>{ui.label}</div>
                <div className="text-[11px]" style={{ color: ui.accent + '99' }}>
                  {count} active goal{count !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => setDrawer(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-black flex-shrink-0"
                style={{ background: ui.accent + '22', border: `1px solid ${ui.accent}55`, color: ui.accent }}
              >
                Edit
              </button>
              <button
                onClick={() => setOpenPillar(open ? null : p)}
                className="p-1"
                style={{ color: ui.accent + 'aa' }}
              >
                <Chevron open={open} color={ui.accent + 'aa'} />
              </button>
            </div>

            {/* Expanded goal list */}
            {open && (
              <div className="px-4 pb-3 pt-1 border-t space-y-0.5" style={{ borderColor: ui.border }}>
                {p === 'nutritional' && (
                  goals.nutritional.length === 0
                    ? <p className="text-xs italic py-2" style={{ color: ui.accent + '66' }}>No goals selected. Tap Edit.</p>
                    : goals.nutritional.map(id => {
                        const label = NUTRI_OPTIONS.find(o => o.id === id)?.label ?? id
                        return (
                          <div key={id} className="flex items-center justify-between py-1.5">
                            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{label}</span>
                            <button onClick={() => toggleNutri(id)} style={{ color: ui.accent + '88' }} className="hover:text-red-400 text-xs px-1">✕</button>
                          </div>
                        )
                      })
                )}

                {p === 'spiritual' && (
                  goals.spiritual.filter(g => g.included).length === 0
                    ? <p className="text-xs italic py-2" style={{ color: ui.accent + '66' }}>No goals active. Tap Edit.</p>
                    : goals.spiritual.filter(g => g.included).map(g => (
                        <GoalRow
                          key={g.id} goal={g} accent={ui.accent}
                          onEdit={() => setDrawer('spiritual')}
                          onRemove={() => togglePillar('spiritual', g.id, false)}
                        />
                      ))
                )}

                {p === 'physical' && (
                  goals.physical.filter(g => g.included).length === 0
                    ? <p className="text-xs italic py-2" style={{ color: ui.accent + '66' }}>No goals active. Tap Edit.</p>
                    : goals.physical.filter(g => g.included).map(g => (
                        <GoalRow
                          key={g.id} goal={g} accent={ui.accent}
                          onEdit={() => setDrawer('physical')}
                          onRemove={() => togglePillar('physical', g.id, false)}
                        />
                      ))
                )}

                {p === 'personal' && (
                  goals.personal.filter(g => g.included).length === 0
                    ? <p className="text-xs italic py-2" style={{ color: ui.accent + '66' }}>No goals active. Tap Edit.</p>
                    : goals.personal.filter(g => g.included).map(g => (
                        <GoalRow
                          key={g.id} goal={g} accent={ui.accent}
                          onEdit={() => setDrawer('personal')}
                          onRemove={() => togglePillar('personal', g.id, false)}
                        />
                      ))
                )}

                <button
                  onClick={() => setDrawer(p)}
                  className="w-full mt-2 py-2 rounded-lg border border-dashed text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ borderColor: ui.accent + '55', color: ui.accent + 'aa' }}
                >
                  + Manage {ui.label} goals
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Bottom sheet drawer ────────────────────────────────────────────── */}
      {drawer !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setDrawer(null)}
          />

          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-dct-surface rounded-t-2xl flex flex-col"
            style={{ maxHeight: '88vh', animation: 'slideUp 0.25s ease' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-dct-border rounded-full" />
            </div>

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-dct-border flex-shrink-0">
              <h3 className="font-black text-base">
                {drawer === 'challenge' ? 'Challenge Settings'
                  : `Edit ${PILLAR_UI[drawer as PillarKey].label}`}
              </h3>
              <button onClick={() => setDrawer(null)} className="text-dct-muted hover:text-dct-text text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            {/* Drawer content — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ paddingBottom: '1rem' }}>

              {/* ── Challenge settings ────────────────────────────────── */}
              {drawer === 'challenge' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-dct-muted uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      className={inputCls} type="date" value={config.start_date}
                      onChange={e => setConfig(c => ({ ...c, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dct-muted uppercase tracking-wider mb-1.5">Duration</label>
                    <select
                      className={inputCls} value={durationChoice}
                      onChange={e => {
                        setDurationChoice(e.target.value)
                        if (e.target.value !== 'other') setConfig(c => ({ ...c, duration: parseInt(e.target.value) }))
                      }}
                    >
                      <option value="21">21 Days</option>
                      <option value="40">40 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="other">Other…</option>
                    </select>
                    {durationChoice === 'other' && (
                      <input
                        className={`${inputCls} mt-2`} type="number" min={1} max={365}
                        placeholder="Enter number of days" value={config.duration}
                        onChange={e => setConfig(c => ({ ...c, duration: parseInt(e.target.value) || 1 }))}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── Nutritional ───────────────────────────────────────── */}
              {drawer === 'nutritional' && (
                <div className="space-y-2">
                  <p className="text-xs text-dct-muted">Select which nutritional goals you want to track daily.</p>
                  {NUTRI_OPTIONS.map(o => {
                    const on = goals.nutritional.includes(o.id)
                    return (
                      <label key={o.id} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                        style={on
                          ? { background: NUTRI.dark, borderColor: NUTRI.primary }
                          : { background: NUTRI.dark + 'aa', borderColor: NUTRI.border }
                        }
                      >
                        <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={on} onChange={() => toggleNutri(o.id)} />
                        <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{o.label}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* ── Spiritual ─────────────────────────────────────────── */}
              {drawer === 'spiritual' && (
                <div className="space-y-3">
                  {SPIRIT_DEFS.map(def => {
                    const g = goals.spiritual.find(x => x.id === def.id) ?? { ...def, included: false, customName: '' }
                    return (
                      <GoalEditBlock
                        key={def.id}
                        def={def} goal={g} accent={SPIRIT.light} accentBg={SPIRIT.dark} accentBorder={SPIRIT.border}
                        pillar="spiritual" inputCls={inputCls}
                        onToggle={v => togglePillar('spiritual', def.id, v)}
                        onNameChange={v => setPillarName('spiritual', def.id, v)}
                        onTypeChange={t => setGoalType('spiritual', def.id, t)}
                        tierInput={tierInputs[def.id] ?? ''}
                        onTierInputChange={v => setTierInputs(s => ({ ...s, [def.id]: v }))}
                        onAddTier={() => addTier('spiritual', def.id)}
                        onRemoveTier={tier => removeTier('spiritual', def.id, tier)}
                      />
                    )
                  })}
                </div>
              )}

              {/* ── Physical ──────────────────────────────────────────── */}
              {drawer === 'physical' && (
                <div className="space-y-3">
                  {PHYSICAL_DEFS.map(def => {
                    const g = goals.physical.find(x => x.id === def.id) ?? { ...def, included: false, customName: '' }
                    const isCategorized = (CATEGORIZED_PHYSICAL_IDS as readonly string[]).includes(def.id)
                    return (
                      <div key={def.id}>
                        <GoalEditBlock
                          def={def} goal={g} accent={PHYSI.light} accentBg={PHYSI.dark} accentBorder={PHYSI.border}
                          pillar="physical" inputCls={inputCls}
                          onToggle={v => togglePillar('physical', def.id, v)}
                          onNameChange={v => setPillarName('physical', def.id, v)}
                          onTypeChange={t => setGoalType('physical', def.id, t)}
                          tierInput={tierInputs[def.id] ?? ''}
                          onTierInputChange={v => setTierInputs(s => ({ ...s, [def.id]: v }))}
                          onAddTier={() => addTier('physical', def.id)}
                          onRemoveTier={tier => removeTier('physical', def.id, tier)}
                          hideTiers={isCategorized}
                        />

                      </div>
                    )
                  })}

                  {/* Exercise name pool */}
                  <div className="pt-2 border-t border-dct-border space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider" style={{ color: PHYSI.light }}>Exercise Name Pool</div>
                    <p className="text-[11px] text-dct-muted">These appear in the exercise dropdown when logging.</p>
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder="e.g. Bench Press, Running…" value={exInput}
                        onChange={e => setExInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExType()} />
                      <button onClick={() => addExType()} className="px-3 py-2 rounded-lg text-sm font-bold text-white whitespace-nowrap"
                        style={{ background: PHYSI.primary }}>+ Add</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {goals.exerciseTypes.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ background: PHYSI.primary + '33', color: PHYSI.light, border: `1px solid ${PHYSI.border}` }}>
                          {t} <button onClick={() => removeExType(t)} className="opacity-70 hover:opacity-100">✕</button>
                        </span>
                      ))}
                    </div>
                    <button onClick={() => setShowExSugg(s => !s)} className="text-xs hover:opacity-80" style={{ color: PHYSI.light }}>
                      💡 {showExSugg ? 'Hide suggestions' : 'Need ideas?'}
                    </button>
                    {showExSugg && (
                      <div className="flex flex-wrap gap-1.5">
                        {EXERCISE_SUGGESTIONS.filter(s => !goals.exerciseTypes.includes(s)).map(s => (
                          <button key={s} onClick={() => addExType(s)}
                            className="text-[10px] px-2 py-1 rounded-full transition-colors"
                            style={{ background: PHYSI.primary + '22', color: PHYSI.light, border: `1px solid ${PHYSI.border}` }}>
                            + {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Stretching name pool */}
                  <div className="pt-2 border-t border-dct-border space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider" style={{ color: PHYSI.light }}>Stretching / Mobility Name Pool</div>
                    <p className="text-[11px] text-dct-muted">These appear in the stretching dropdown when logging.</p>
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder="e.g. Hip Flexors, Foam Roll…" value={stInput}
                        onChange={e => setStInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStType()} />
                      <button onClick={() => addStType()} className="px-3 py-2 rounded-lg text-sm font-bold text-white whitespace-nowrap"
                        style={{ background: PHYSI.primary }}>+ Add</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {goals.stretchingTypes.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                          style={{ background: PHYSI.primary + '33', color: PHYSI.light, border: `1px solid ${PHYSI.border}` }}>
                          {t} <button onClick={() => removeStType(t)} className="opacity-70 hover:opacity-100">✕</button>
                        </span>
                      ))}
                      {goals.stretchingTypes.length === 0 && (
                        <p className="text-[10px] text-dct-muted italic">No stretching options added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Personal ──────────────────────────────────────────── */}
              {drawer === 'personal' && (
                <div className="space-y-3">
                  {PERSONAL_DEFS.map(def => {
                    const g = goals.personal.find(x => x.id === def.id) ?? { ...def, included: false, customName: '' }
                    return (
                      <GoalEditBlock
                        key={def.id}
                        def={def} goal={g} accent={PERSO.light} accentBg={PERSO.dark} accentBorder={PERSO.border}
                        pillar="personal" inputCls={inputCls}
                        onToggle={v => togglePillar('personal', def.id, v)}
                        onNameChange={v => setPillarName('personal', def.id, v)}
                        onTypeChange={t => setGoalType('personal', def.id, t)}
                        tierInput={tierInputs[def.id] ?? ''}
                        onTierInputChange={v => setTierInputs(s => ({ ...s, [def.id]: v }))}
                        onAddTier={() => addTier('personal', def.id)}
                        onRemoveTier={tier => removeTier('personal', def.id, tier)}
                      />
                    )
                  })}
                </div>
              )}

            </div>

            {/* Drawer footer */}
            <div
              className="flex gap-3 px-5 py-4 border-t border-dct-border flex-shrink-0"
              style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                onClick={() => setDrawer(null)}
                className="flex-1 py-3 bg-dct-surface2 border border-dct-border rounded-xl text-sm font-bold text-dct-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                style={{ background: SPIRIT.primary }}
              >
                {isPending ? 'Saving…' : 'Save goals'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Single row in the accordion goal list */
function GoalRow({
  goal, accent, onEdit, onRemove,
}: {
  goal: PillarGoal
  accent: string
  onEdit: () => void
  onRemove: () => void
}) {
  const name   = goal.customName || goal.defaultName
  const detail = goal.goalType === 'tiered' && (goal.tiers ?? []).length > 0
    ? `Tiered: ${(goal.tiers ?? []).join(' / ')}`
    : goal.customName ? goal.customName : goal.hint

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: '#e2e8f0' }}>{name}</div>
        {detail && detail !== name && (
          <div className="text-[10px] truncate" style={{ color: accent + '88' }}>{detail}</div>
        )}
      </div>
      <button onClick={onEdit} style={{ color: accent + 'aa' }} className="hover:opacity-70 transition-opacity p-1" title="Edit goal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button onClick={onRemove} style={{ color: accent + '88' }} className="hover:text-red-400 transition-colors p-1 text-xs" title="Remove goal">✕</button>
    </div>
  )
}

/** Full goal edit block used inside the drawer */
function GoalEditBlock({
  def, goal, accent, accentBg, accentBorder, pillar: _pillar, inputCls,
  onToggle, onNameChange, onTypeChange,
  tierInput, onTierInputChange, onAddTier, onRemoveTier,
  hideTiers = false,
}: {
  def: { id: string; defaultName: string; hint: string }
  goal: PillarGoal
  accent: string
  accentBg: string
  accentBorder: string
  pillar: string
  inputCls: string
  onToggle: (v: boolean) => void
  onNameChange: (v: string) => void
  onTypeChange: (t: 'standard' | 'tiered') => void
  tierInput: string
  onTierInputChange: (v: string) => void
  onAddTier: () => void
  onRemoveTier: (tier: string) => void
  hideTiers?: boolean
}) {
  const gtype = goal.goalType ?? 'standard'

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: goal.included ? accentBorder : accentBorder + '55', background: accentBg }}
    >
      {/* Toggle header */}
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <div
          className="relative flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center"
          style={goal.included
            ? { background: accent, borderColor: accent }
            : { background: 'transparent', borderColor: '#475569' }
          }
        >
          {goal.included && <span className="text-[10px] font-black text-white leading-none">✓</span>}
          <input
            type="checkbox" className="sr-only" checked={goal.included}
            onChange={e => onToggle(e.target.checked)}
          />
        </div>
        <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>{def.defaultName}</span>
      </label>

      {/* Expanded edit fields */}
      {goal.included && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: accentBorder + '66' }}>
          <div className="pt-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: accent + 'bb' }}>
              Goal Name / Target
            </label>
            <input
              className={inputCls} placeholder={def.hint}
              value={goal.customName} onChange={e => onNameChange(e.target.value)}
            />
          </div>

          {!hideTiers && (
            <>
              {/* Type toggle */}
              <div className="flex gap-2">
                {(['standard', 'tiered'] as const).map(t => (
                  <button
                    key={t} type="button" onClick={() => onTypeChange(t)}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all"
                    style={gtype === t
                      ? { background: accent + '55', color: '#ffffff', border: `1px solid ${accent}` }
                      : { background: 'transparent', color: '#94a3b8', border: `1px solid ${accentBorder}` }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tiered options */}
              {gtype === 'tiered' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider" style={{ color: accent + 'bb' }}>
                    Tier Options
                  </label>
                  <div className="flex gap-2">
                    <input
                      className={inputCls} placeholder="Add a tier option…"
                      value={tierInput} onChange={e => onTierInputChange(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && onAddTier()}
                    />
                    <button
                      type="button" onClick={onAddTier}
                      className="px-3 py-2 rounded-lg text-sm font-bold text-white whitespace-nowrap"
                      style={{ background: accent + 'cc' }}
                    >+ Add</button>
                  </div>
                  {(goal.tiers ?? []).map((tier, idx) => (
                    <div key={tier} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: accent + '15', border: `1px solid ${accent}33` }}>
                      <span className="text-dct-muted text-xs font-bold w-5">{idx + 1}.</span>
                      <span className="flex-1 text-xs font-semibold" style={{ color: accent }}>{tier}</span>
                      <button type="button" onClick={() => onRemoveTier(tier)} className="text-dct-muted hover:text-red-400 text-xs">✕</button>
                    </div>
                  ))}
                  {(goal.tiers ?? []).length < 2 && (
                    <p className="text-[10px] text-dct-muted italic">
                      {(goal.tiers ?? []).length === 0 ? 'Add at least 2 tier options.' : '⚠️ Add at least one more option.'}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
