import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import type { UserProfile } from '@/lib/types'

// ─── Level routing hub ────────────────────────────────────────────────────────
// Every authenticated visit resolves here.
// Routing rules:
//   no user_profile row        → upsert one → /onboarding
//   onboarding_completed=false → /onboarding
//   onboarding_completed=true  → /dashboard

export default async function Home() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const supabase = createServerSupabaseClient()

  // Upsert a profile row on first sign-in; ignore conflict if row already exists
  await supabase
    .from('user_profile')
    .upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )

  const { data: profile, error } = await supabase
    .from('user_profile')
    .select('onboarding_completed')
    .eq('user_id', userId)
    .single<Pick<UserProfile, 'onboarding_completed'>>()

  if (error || !profile) {
    // DB error — fall through to onboarding rather than loop
    redirect('/onboarding')
  }

  if (!profile.onboarding_completed) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}
