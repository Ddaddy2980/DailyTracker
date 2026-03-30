'use client'

export type BottomNavTab = 'dashboard' | 'groups' | 'history' | 'videos' | 'goals'

interface Props {
  activeTab:     BottomNavTab
  onTab:         (tab: BottomNavTab) => void
  disabledTabs?: BottomNavTab[]
}

const TABS: { id: BottomNavTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'groups',    label: 'Groups'    },
  { id: 'history',   label: 'History'   },
  { id: 'videos',    label: 'Videos'    },
  { id: 'goals',     label: 'Goals'     },
]

function GridIcon()     { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function CalendarIcon() { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function PeopleIcon()   { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function PlayIcon()     { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> }
function TargetIcon()   { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }

const ICONS: Record<BottomNavTab, () => JSX.Element> = {
  dashboard: GridIcon,
  groups:    PeopleIcon,
  history:   CalendarIcon,
  videos:    PlayIcon,
  goals:     TargetIcon,
}

export default function BottomNav({ activeTab, onTab, disabledTabs = [] }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--card-border)] px-1 py-2">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {TABS.map(tab => {
          const Icon       = ICONS[tab.id]
          const isActive   = activeTab === tab.id
          const isDisabled = disabledTabs.includes(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTab(tab.id)}
              disabled={isDisabled}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-0 ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              style={{ color: isActive ? 'var(--nav-active)' : 'var(--nav-inactive)' }}
            >
              <Icon />
              <span className="text-[9px] font-semibold">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
