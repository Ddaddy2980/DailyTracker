import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserConfig, getUserGoals, getEntry, getHistory, getUserProfile } from '@/app/actions'
import { todayStr } from '@/lib/constants'
import AppShell from './AppShell'

// Always fetch fresh data from Supabase — never serve a cached page
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { today?: string }
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Level guard: Level 1 users belong in the challenge view, not the tracker.
  const profile = await getUserProfile()
  if (profile && !profile.onboarding_completed) redirect('/onboarding')
  if (profile && profile.current_level === 1) redirect('/challenge')

  const config = await getUserConfig()
  if (!config) redirect('/setup')

  // Use client-provided local date if present; fall back to server UTC date
  const today = searchParams.today ?? todayStr()

  const [goals, todayEntry, history] = await Promise.all([
    getUserGoals(),
    getEntry(today),
    getHistory(90),
  ])

  return (
    <AppShell
      config={config}
      goals={goals}
      todayEntry={todayEntry}
      history={history}
      today={today}
    />
  )
}
