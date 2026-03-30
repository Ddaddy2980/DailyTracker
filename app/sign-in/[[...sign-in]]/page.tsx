import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { SignIn } from '@clerk/nextjs'
import { getUserProfile } from '@/app/actions'

// ── Clerk appearance ──────────────────────────────────────────────────────────

const clerkAppearance = {
  variables: {
    colorPrimary:          '#275578',
    colorBackground:       '#ffffff',
    colorText:             '#1a1a2e',
    colorTextSecondary:    '#6b7280',
    borderRadius:          '0.75rem',
    fontFamily:            'inherit',
  },
  elements: {
    formButtonPrimary: 'bg-[#275578] hover:bg-[#1e4068] text-white',
    card:              'shadow-none border-0',
  },
} as const

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SignInRoute() {
  const { userId } = await auth()

  if (userId) {
    const profile = await getUserProfile()
    if (profile?.onboarding_completed) {
      redirect('/journey')
    } else {
      redirect('/onboarding')
    }
  }

  return (
    <main
      style={{ backgroundColor: 'var(--app-bg)' }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
    >

      {/* Logo */}
      <Image
        src="/Logo.png"
        width={64}
        height={64}
        alt="Altared Life"
        className="mb-5"
      />

      {/* App name */}
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-10">
        Daily Consistency Tracker
      </p>

      {/* Sign-in card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[var(--card-border)] p-6">

        <SignIn
          forceRedirectUrl="/"
          appearance={clerkAppearance}
        />

        <p className="text-xs italic text-[var(--text-muted)] text-center mt-5 leading-relaxed">
          &ldquo;He who calls you is faithful; he will surely do it.&rdquo;
          <br />— 1 Thessalonians 5:24
        </p>

      </div>

      {/* Sign-up link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          New here?{' '}
          <Link
            href="/sign-up"
            className="font-semibold text-[#275578] hover:text-[#1e4068] transition-colors"
          >
            Begin your journey →
          </Link>
        </p>
      </div>

    </main>
  )
}
