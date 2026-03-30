'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'
import { calcCompletion, todayStr, type UserConfig, type UserGoals, type DailyEntry } from '@/lib/constants'
import { SPIRIT } from '@/lib/brand'
import DashboardTab from './DashboardTab'
import LogTab from './LogTab'
import HistoryTab from './HistoryTab'
import GoalsTab from './GoalsTab'

type Tab    = 'dash' | 'log' | 'history' | 'goals'
type Pillar = 's' | 'p' | 'n' | 'pe'

// ── Bottom nav icons (inline SVG) ─────────────────────────────────────────────
function IconDash()    { return <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg> }
function IconLog()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IconHistory() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function IconGoals()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }

const NAV_ITEMS: { id: Tab; label: string; Icon: () => JSX.Element }[] = [
  { id: 'dash',    label: 'Dashboard', Icon: IconDash    },
  { id: 'log',     label: 'Check In',  Icon: IconLog     },
  { id: 'history', label: 'History',   Icon: IconHistory },
  { id: 'goals',   label: 'Goals',     Icon: IconGoals   },
]

type Props = {
  config:     UserConfig
  goals:      UserGoals
  todayEntry: DailyEntry | null
  history:    DailyEntry[]
  today:      string
}

export default function AppShell({ config, goals: initialGoals, todayEntry: initialEntry, history: initialHistory, today }: Props) {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('dash')

  // On mount, ensure the server used the client's local date.
  // If the URL doesn't have the correct local date, reload with it so the
  // server fetches the right entry for today's timezone.
  useEffect(() => {
    const localToday = todayStr()
    if (today !== localToday) {
      router.replace(`/dashboard?today=${localToday}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [goals, setGoals]       = useState(initialGoals)
  const [todayEntry, setEntry]  = useState(initialEntry)
  const [history, setHistory]   = useState(initialHistory)
  const [editingDate,   setEditingDate]   = useState<string | null>(null)
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null)

  const todayPct = calcCompletion(todayEntry, goals)

  function handleEditDay(date: string, pillar?: Pillar) {
    setEditingDate(date)
    setEditingPillar(pillar ?? null)
    setTab('log')
  }

  function handleGoToLog(pillar: Pillar) {
    setEditingDate(null)
    setEditingPillar(pillar)
    setTab('log')
  }

  function handleNavClick(id: Tab) {
    setEditingDate(null)
    setEditingPillar(null)
    setTab(id)
  }

  function handleSaved(entry: DailyEntry) {
    if (entry.entry_date === todayStr()) setEntry(entry)
    setHistory(h => {
      const idx = h.findIndex(e => e.entry_date === entry.entry_date)
      return idx >= 0
        ? h.map((e, i) => i === idx ? entry : e)
        : [entry, ...h].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    })
  }

  return (
    <div className="min-h-screen text-dct-text flex flex-col">

      {/* ── Minimal sticky header ─────────────────────────────────────────── */}
      <header className="bg-dct-surface border-b border-dct-border sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 flex-shrink-0">
              <Image src="/Logo.png" alt="DCT" fill className="object-contain" />
            </div>
            <span className="font-black text-sm text-dct-text">Daily Consistency Tracker</span>
          </div>
          <UserButton />
        </div>
      </header>

      {/* ── Page content — padded so it never hides behind bottom nav ─────── */}
      <main className="flex-1 min-h-0 max-w-3xl w-full mx-auto px-4 pt-3 pb-24">
        {tab === 'dash' && (
          <DashboardTab
            config={config} goals={goals} todayEntry={todayEntry}
            history={history} todayPct={todayPct}
            onNavigate={setTab}
            onGoToLog={handleGoToLog}
            onGoToDay={handleEditDay}
          />
        )}
        {tab === 'log' && (
          <LogTab
            key={`${editingDate ?? 'today'}-${editingPillar ?? ''}`}
            goals={goals}
            todayEntry={todayEntry}
            history={history}
            initialDate={editingDate ?? todayStr()}
            initialPillar={editingPillar ?? 's'}
            onSaved={handleSaved}
          />
        )}
        {tab === 'history' && (
          <HistoryTab history={history} goals={goals} config={config} onEditDay={handleEditDay} />
        )}
        {tab === 'goals' && (
          <GoalsTab initialGoals={goals} initialConfig={config} onSaved={setGoals} />
        )}
      </main>

      {/* ── Fixed bottom navigation bar ───────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-dct-surface border-t border-dct-border z-50 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => handleNavClick(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
              style={{ color: active ? SPIRIT.primary : '#64748b' }}
            >
              <Icon />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
