import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

// Onboarding flow — full 5-screen experience built in Step 3.
// This placeholder confirms the route is live and auth is enforced.

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold">Onboarding</h1>
      <p className="text-slate-400 text-sm text-center max-w-xs">
        The full onboarding experience is coming in Step 3.
      </p>
    </main>
  )
}
