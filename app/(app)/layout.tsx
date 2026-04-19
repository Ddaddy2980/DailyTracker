import Image from 'next/image'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getEffectiveChallengeDay } from '@/lib/constants'
import type { Challenge, UserProfile } from '@/lib/types'
import BottomNav from '@/components/shared/BottomNav'
import UserAvatarMenu from '@/components/shared/UserAvatarMenu'

async function getDayInfo(): Promise<{ current: number; total: number } | null> {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('user_profile')
    .select('active_challenge_id')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'active_challenge_id'>>()

  if (!profile?.active_challenge_id) return null

  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, duration_days, start_date, status, is_paused, paused_at, pause_days_used, scheduled_pause_date, scheduled_pause_reason')
    .eq('id', profile.active_challenge_id)
    .single<Challenge>()

  if (!challenge || challenge.status !== 'active') return null

  const current = getEffectiveChallengeDay(challenge)
  return { current, total: challenge.duration_days }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dayInfo = await getDayInfo()

  return (
    <div className="min-h-screen bg-[#EBEBEC]">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-14 px-4 flex items-center">
        {/* Left: app icon */}
        <div className="w-10 flex-shrink-0">
          <Image
            src="/logo_2.png"
            alt="Daily Consistency Tracker"
            width={36}
            height={36}
            className="rounded-lg"
          />
        </div>

        {/* Center: title + day counter */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-slate-800 leading-tight">
            Daily Consistency Tracker
          </span>
          {dayInfo && (
            <span className="text-xs text-slate-500 leading-tight">
              Day {dayInfo.current} of {dayInfo.total}
            </span>
          )}
        </div>

        {/* Right: avatar menu */}
        <div className="w-10 flex-shrink-0 flex justify-end">
          <UserAvatarMenu />
        </div>
      </header>

      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  )
}
