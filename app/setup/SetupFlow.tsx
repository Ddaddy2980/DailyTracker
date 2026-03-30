'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { finishSetup } from '@/app/actions'
import {
  SPIRIT_DEFS, PHYSICAL_DEFS, PERSONAL_DEFS, NUTRI_OPTIONS, CATEGORIZED_PHYSICAL_IDS,
  defaultGoals, todayStr,
  type UserConfig, type UserGoals, type PillarGoal,
} from '@/lib/constants'
import { DURATION_INFO, ACT_NUDGE, GOAL_SAMPLES, EXERCISE_SUGGESTIONS } from '@/lib/goalCoaching'

type Screen = 'info' | 'goals'

export default function SetupFlow() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('info')
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Screen 1 state
  const [name, setName]           = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [duration, setDuration]   = useState(21)
  const [durationChoice, setDurationChoice] = useState<string>('21')

  // Screen 2 state
  const [goals, setGoals]           = useState<UserGoals>(defaultGoals())
  const [exInput, setExInput]       = useState('')
  const [stInput, setStInput]       = useState('')
  const [showExSuggestions, setShowExSuggestions] = useState(false)
  const [subTypeInputs, setSubTypeInputs] = useState<Record<string, string>>({})

  // ── Screen 1 → 2 ──────────────────────────────────────────────────────────
  function goToGoals() {
    if (!startDate) return
    setScreen('goals')
  }

  // ── Exercise types ────────────────────────────────────────────────────────
  function addExType(val?: string) {
    const v = (val ?? exInput).trim()
    if (!v || goals.exerciseTypes.includes(v)) return
    setGoals(g => ({ ...g, exerciseTypes: [...g.exerciseTypes, v] }))
    if (!val) setExInput('')
  }
  function removeExType(val: string) {
    setGoals(g => ({ ...g, exerciseTypes: g.exerciseTypes.filter(e => e !== val) }))
  }

  // ── Stretching types ──────────────────────────────────────────────────────
  function addStType(val?: string) {
    const v = (val ?? stInput).trim()
    if (!v || goals.stretchingTypes.includes(v)) return
    setGoals(g => ({ ...g, stretchingTypes: [...g.stretchingTypes, v] }))
    if (!val) setStInput('')
  }
  function removeStType(val: string) {
    setGoals(g => ({ ...g, stretchingTypes: g.stretchingTypes.filter(s => s !== val) }))
  }

  // ── Physical goal sub-types (exercise_training, stretching) ──────────────
  function addSubType(goalId: string) {
    const val = (subTypeInputs[goalId] ?? '').trim()
    if (!val) return
    setGoals(g => ({
      ...g,
      physical: g.physical.map(p =>
        p.id === goalId && !(p.subTypes ?? []).includes(val)
          ? { ...p, subTypes: [...(p.subTypes ?? []), val] } : p
      ),
    }))
    setSubTypeInputs(s => ({ ...s, [goalId]: '' }))
  }
  function removeSubType(goalId: string, val: string) {
    setGoals(g => ({
      ...g,
      physical: g.physical.map(p =>
        p.id === goalId ? { ...p, subTypes: (p.subTypes ?? []).filter(s => s !== val) } : p
      ),
    }))
  }

  // ── Toggle spiritual / physical / personal ─────────────────────────────────
  function togglePillarGoal(pillar: 'spiritual' | 'physical' | 'personal', id: string, checked: boolean) {
    setGoals(g => ({
      ...g,
      [pillar]: (g[pillar] as PillarGoal[]).map(p =>
        p.id === id ? { ...p, included: checked } : p
      ),
    }))
  }
  function setPillarName(pillar: 'spiritual' | 'physical' | 'personal', id: string, val: string) {
    setGoals(g => ({
      ...g,
      [pillar]: (g[pillar] as PillarGoal[]).map(p =>
        p.id === id ? { ...p, customName: val } : p
      ),
    }))
  }

  // ── Nutritional toggles ────────────────────────────────────────────────────
  function toggleNutri(id: string) {
    setGoals(g => ({
      ...g,
      nutritional: g.nutritional.includes(id)
        ? g.nutritional.filter(n => n !== id)
        : [...g.nutritional, id],
    }))
  }

  // ── Finish setup ──────────────────────────────────────────────────────────
  function handleFinish() {
    const config: UserConfig = { name: name || 'Champion', start_date: startDate, duration }
    setSaveError(null)
    startTransition(async () => {
      try {
        await finishSetup(config, goals)
        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      }
    })
  }

  // ─── Shared input style ───────────────────────────────────────────────────
  const inputCls = 'w-full px-3 py-2 bg-dct-surface2 border border-dct-border rounded-lg text-dct-text text-sm outline-none focus:border-spirit transition-colors'

  // ─── Screen 1 ─────────────────────────────────────────────────────────────
  if (screen === 'info') return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dct-bg via-[#1e1b4b] to-dct-bg">
      <div className="bg-dct-surface border border-dct-border rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-spirit to-physi flex items-center justify-center text-3xl mx-auto mb-4">🎯</div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-spirit-lt to-physi-lt bg-clip-text text-transparent mb-1">Daily Consistency Tracker</h1>
        <p className="text-dct-muted text-sm mb-6">Build lasting habits across the four pillars of a consistent life</p>
        <div className="flex flex-wrap justify-center gap-2 mb-6 text-xs font-bold">
          {[
            { label: 'Spiritual',   bg: 'bg-spirit/20', text: 'text-spirit-lt', icon: '/Spiritual_Icon_Bk.png'     },
            { label: 'Physical',    bg: 'bg-physi/20',  text: 'text-physi-lt',  icon: '/Physical_Icon_Bk.png'   },
            { label: 'Nutritional', bg: 'bg-nutri/20',  text: 'text-nutri-lt',  icon: '/Nutritional_Icon_Bk.png'},
            { label: 'Personal',    bg: 'bg-perso/20',  text: 'text-perso-lt',  icon: '/Personal_Icon_Bk.png'   },
          ].map(p => (
            <span key={p.label} className={`flex items-center gap-1.5 ${p.bg} ${p.text} px-3 py-1 rounded-full`}>
              <div className="relative w-3.5 h-3.5 flex-shrink-0">
                <Image src={p.icon} alt="" fill className="object-contain" />
              </div>
              {p.label}
            </span>
          ))}
        </div>

        <div className="text-left space-y-3">
          <div>
            <label className="block text-xs font-bold text-dct-muted uppercase tracking-wider mb-1">Your Name</label>
            <input className={inputCls} placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-dct-muted uppercase tracking-wider mb-1">Start Date</label>
              <input className={inputCls} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-dct-muted uppercase tracking-wider mb-1">Challenge Length</label>
              <select className={inputCls} value={durationChoice} onChange={e => {
                setDurationChoice(e.target.value)
                if (e.target.value !== 'other') setDuration(parseInt(e.target.value))
              }}>
                <option value="21">21 Days</option>
                <option value="40">40 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
                <option value="other">Other...</option>
              </select>
              {durationChoice === 'other' && (
                <input className={`${inputCls} mt-2`} type="number" min={1} max={365}
                  placeholder="Enter number of days"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value) || 1)} />
              )}
            </div>
          </div>

          {/* Option 2 — Duration coaching */}
          <div className="flex items-start gap-2 px-3 py-2.5 bg-spirit/10 border border-spirit/20 rounded-lg">
            <span className="text-spirit-lt flex-shrink-0 mt-0.5">💡</span>
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-spirit-lt">{DURATION_INFO[durationChoice].headline}</span>
              <span className="text-dct-muted"> — {DURATION_INFO[durationChoice].detail}</span>
            </div>
          </div>
        </div>

        <button onClick={goToGoals} className="mt-6 w-full py-3 bg-gradient-to-r from-spirit to-physi text-white font-bold rounded-lg hover:opacity-90 transition-opacity">
          Next: Set Your Goals →
        </button>
      </div>
    </div>
  )

  // ─── Screen 2 ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-dct-bg via-[#1e1b4b] to-dct-bg">
      <div className="max-w-lg mx-auto bg-dct-surface border border-dct-border rounded-2xl p-6 shadow-2xl mt-4">
        <h2 className="text-xl font-black mb-1">Customize Your Daily Goals</h2>
        <p className="text-dct-muted text-sm mb-5">Choose what you want to track in each area.</p>

        {/* Spiritual */}
        <section className="mb-5">
          <div className="text-xs font-black uppercase tracking-widest text-spirit-lt flex items-center gap-2 mb-3">
            <div className="relative w-4 h-4 flex-shrink-0"><Image src="/Spiritual_Icon_Bk.png" alt="" fill className="object-contain" /></div>
            Spiritual — Choose Your Disciplines
          </div>
          <div className="space-y-2">
            {SPIRIT_DEFS.map(def => {
              const g = goals.spiritual.find(x => x.id === def.id)!
              return (
                <div key={def.id} className={`rounded-lg border-2 bg-dct-surface2 overflow-hidden transition-colors ${g.included ? 'border-spirit' : 'border-dct-border'}`}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer">
                    <input type="checkbox" className="chk-spirit w-4 h-4" checked={g.included} onChange={e => togglePillarGoal('spiritual', def.id, e.target.checked)} />
                    <span className="text-sm font-bold">{def.defaultName}</span>
                  </label>
                  {g.included && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* Custom name input */}
                      <input className={inputCls} placeholder={def.hint} value={g.customName} onChange={e => setPillarName('spiritual', def.id, e.target.value)} />
                      {/* Option 5 — Sample suggestions */}
                      {GOAL_SAMPLES[def.id] && (
                        <div className="flex flex-wrap gap-1.5">
                          {GOAL_SAMPLES[def.id].map(s => (
                            <button key={s} type="button"
                              onClick={() => setPillarName('spiritual', def.id, s)}
                              className="text-[10px] px-2 py-1 rounded-full bg-spirit/10 text-spirit-lt border border-spirit/20 hover:bg-spirit/25 transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Option 1 — ACT nudge */}
                      <p className="text-[10px] text-dct-muted italic leading-relaxed">
                        💡 {ACT_NUDGE}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <hr className="border-dct-border my-4" />

        {/* Physical Goals */}
        <section className="mb-5">
          <div className="text-xs font-black uppercase tracking-widest text-physi-lt flex items-center gap-2 mb-3">
            <div className="relative w-4 h-4 flex-shrink-0"><Image src="/Physical_Icon_Bk.png" alt="" fill className="object-contain" /></div>
            Physical — Your Duration Goals
          </div>
          <div className="space-y-2">
            {PHYSICAL_DEFS.map(def => {
              const g = goals.physical.find(x => x.id === def.id)!
              const isCategorized = (CATEGORIZED_PHYSICAL_IDS as readonly string[]).includes(def.id)
              return (
                <div key={def.id} className={`rounded-lg border-2 bg-dct-surface2 overflow-hidden transition-colors ${g.included ? 'border-physi' : 'border-dct-border'}`}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer">
                    <input type="checkbox" className="chk-physi w-4 h-4" checked={g.included} onChange={e => togglePillarGoal('physical', def.id, e.target.checked)} />
                    <span className="text-sm font-bold">{def.defaultName}</span>
                  </label>
                  {g.included && (
                    <div className="px-3 pb-3 space-y-2">
                      {isCategorized ? (
                        /* Sub-type tag editor for exercise_training & stretching */
                        <>
                          {/* Goal description */}
                          <input className={inputCls} placeholder={def.hint} value={g.customName ?? ''}
                            onChange={e => setPillarName('physical', def.id, e.target.value)} />
                          {GOAL_SAMPLES[def.id] && (
                            <div className="flex flex-wrap gap-1.5">
                              {GOAL_SAMPLES[def.id].map(s => (
                                <button key={s} type="button" onClick={() => setPillarName('physical', def.id, s)}
                                  className="text-[10px] px-2 py-1 rounded-full bg-physi/10 text-physi-lt border border-physi/20 hover:bg-physi/25 transition-colors">
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-[11px] text-dct-muted mt-1">
                            Add the specific types you want to log (e.g. {def.id === 'exercise_training' ? 'Strength Training, Cardio' : 'Yoga, Foam Rolling'}).
                          </p>
                          <div className="flex gap-2">
                            <input
                              className={inputCls}
                              placeholder={def.id === 'exercise_training' ? 'e.g. Strength Training' : 'e.g. Yoga'}
                              value={subTypeInputs[def.id] ?? ''}
                              onChange={e => setSubTypeInputs(s => ({ ...s, [def.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && addSubType(def.id)}
                            />
                            <button type="button" onClick={() => addSubType(def.id)}
                              className="px-3 py-2 bg-physi text-white text-sm font-bold rounded-lg whitespace-nowrap hover:opacity-85 transition-opacity">
                              + Add
                            </button>
                          </div>
                          {(g.subTypes ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(g.subTypes ?? []).map(st => (
                                <span key={st} className="flex items-center gap-1 bg-physi/20 text-physi-lt border border-physi/30 px-2 py-1 rounded-full text-xs font-semibold">
                                  {st}
                                  <button type="button" onClick={() => removeSubType(def.id, st)} className="opacity-70 hover:opacity-100">✕</button>
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-dct-muted italic leading-relaxed">💡 {ACT_NUDGE}</p>
                        </>
                      ) : (
                        /* Custom name + sample chips for binary goals */
                        <>
                          <input className={inputCls} placeholder={def.hint} value={g.customName} onChange={e => setPillarName('physical', def.id, e.target.value)} />
                          {GOAL_SAMPLES[def.id] && (
                            <div className="flex flex-wrap gap-1.5">
                              {GOAL_SAMPLES[def.id].map(s => (
                                <button key={s} type="button"
                                  onClick={() => setPillarName('physical', def.id, s)}
                                  className="text-[10px] px-2 py-1 rounded-full bg-physi/10 text-physi-lt border border-physi/20 hover:bg-physi/25 transition-colors">
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-dct-muted italic leading-relaxed">💡 {ACT_NUDGE}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <hr className="border-dct-border my-4" />

        {/* Exercise Types */}
        <section className="mb-5">
          <div className="text-xs font-black uppercase tracking-widest text-physi-lt flex items-center gap-2 mb-2">
            <div className="relative w-4 h-4 flex-shrink-0"><Image src="/Physical_Icon_Bk.png" alt="" fill className="object-contain" /></div>
            Physical — Your Exercise Types
          </div>
          <p className="text-dct-muted text-xs mb-3">Type the exercises you do. Sleep, Weight, and Blood Pressure are always tracked.</p>
          <div className="flex gap-2 mb-2">
            <input className={inputCls} placeholder="e.g. Morning Run, Pushups..." value={exInput}
              onChange={e => setExInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExType()} />
            <button onClick={() => addExType()} className="px-3 py-2 bg-physi text-white text-sm font-bold rounded-lg whitespace-nowrap hover:opacity-85 transition-opacity">+ Add</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {goals.exerciseTypes.map(t => (
              <span key={t} className="flex items-center gap-1 bg-physi/20 text-physi-lt border border-physi/30 px-2 py-1 rounded-full text-xs font-semibold">
                {t}
                <button onClick={() => removeExType(t)} className="opacity-70 hover:opacity-100">✕</button>
              </span>
            ))}
          </div>
          {/* Option 5 — Exercise suggestions */}
          <button type="button" onClick={() => setShowExSuggestions(s => !s)}
            className="text-xs text-physi-lt hover:opacity-80 transition-opacity">
            💡 {showExSuggestions ? 'Hide suggestions' : 'Need exercise ideas?'}
          </button>
          {showExSuggestions && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXERCISE_SUGGESTIONS.filter(s => !goals.exerciseTypes.includes(s)).map(s => (
                <button key={s} type="button" onClick={() => addExType(s)}
                  className="text-[10px] px-2 py-1 rounded-full bg-physi/10 text-physi-lt border border-physi/20 hover:bg-physi/25 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          )}
        </section>

        <hr className="border-dct-border my-4" />

        {/* Nutritional */}
        <section className="mb-5">
          <div className="text-xs font-black uppercase tracking-widest text-nutri-lt flex items-center gap-2 mb-3">
            <div className="relative w-4 h-4 flex-shrink-0"><Image src="/Nutritional_Icon_Bk.png" alt="" fill className="object-contain" /></div>
            Nutritional — Choose What You Track
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NUTRI_OPTIONS.map(o => {
              const on = goals.nutritional.includes(o.id)
              return (
                <label key={o.id} className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all ${on ? 'border-nutri bg-nutri/10' : 'border-transparent bg-dct-surface2'}`}>
                  <input type="checkbox" className="chk-nutri w-4 h-4" checked={on} onChange={() => toggleNutri(o.id)} />
                  <span className="text-sm font-semibold">{o.label}</span>
                </label>
              )
            })}
          </div>
        </section>

        <hr className="border-dct-border my-4" />

        {/* Personal */}
        <section className="mb-6">
          <div className="text-xs font-black uppercase tracking-widest text-perso-lt flex items-center gap-2 mb-3">
            <div className="relative w-4 h-4 flex-shrink-0"><Image src="/Personal_Icon_Bk.png" alt="" fill className="object-contain" /></div>
            Personal — Your Growth Areas
          </div>
          <div className="space-y-2">
            {PERSONAL_DEFS.map(def => {
              const g = goals.personal.find(x => x.id === def.id)!
              return (
                <div key={def.id} className={`rounded-lg border-2 bg-dct-surface2 overflow-hidden transition-colors ${g.included ? 'border-perso' : 'border-dct-border'}`}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer">
                    <input type="checkbox" className="chk-perso w-4 h-4" checked={g.included} onChange={e => togglePillarGoal('personal', def.id, e.target.checked)} />
                    <div>
                      <div className="text-sm font-bold">{def.defaultName}</div>
                      <div className="text-xs text-dct-muted">{def.hint}</div>
                    </div>
                  </label>
                  {g.included && (
                    <div className="px-3 pb-3 space-y-2">
                      {/* Custom name input */}
                      <input className={inputCls} placeholder="Give it a specific name (optional)" value={g.customName} onChange={e => setPillarName('personal', def.id, e.target.value)} />
                      {/* Option 5 — Sample suggestions */}
                      {GOAL_SAMPLES[def.id] && (
                        <div className="flex flex-wrap gap-1.5">
                          {GOAL_SAMPLES[def.id].map(s => (
                            <button key={s} type="button"
                              onClick={() => setPillarName('personal', def.id, s)}
                              className="text-[10px] px-2 py-1 rounded-full bg-perso/10 text-perso-lt border border-perso/20 hover:bg-perso/25 transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Option 1 — ACT nudge */}
                      <p className="text-[10px] text-dct-muted italic leading-relaxed">
                        💡 {ACT_NUDGE}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {saveError && (
          <div className="mb-3 px-4 py-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            ⚠️ {saveError}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setScreen('info')} className="px-5 py-3 bg-dct-surface2 border border-dct-border text-dct-text font-bold rounded-lg hover:bg-dct-border transition-colors">← Back</button>
          <button onClick={handleFinish} disabled={isPending} className="flex-1 py-3 bg-gradient-to-r from-spirit to-physi text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity">
            {isPending ? 'Saving...' : 'Start My Challenge 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}
