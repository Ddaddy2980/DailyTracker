'use client'

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SignUp } from '@clerk/nextjs'

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

export default function SignUpPage() {
  const formRef = useRef<HTMLDivElement>(null)

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main style={{ backgroundColor: 'var(--app-bg)' }} className="min-h-screen">

      {/* ── Section 1 — The invitation ───────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16">

        {/* Logo */}
        <Image
          src="/Logo.png"
          width={64}
          height={64}
          alt="Altared Life"
          className="mb-5"
        />

        {/* App name */}
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-8">
          Daily Consistency Tracker
        </p>

        {/* Headline */}
        <h1 className="text-3xl font-black text-[var(--text-primary)] text-center leading-tight max-w-xs mb-4">
          Does your life feel like it matters?
        </h1>

        {/* Subheadline */}
        <p className="text-[var(--text-secondary)] text-center text-base max-w-xs mb-8">
          Most people know they were made for more. Few have a daily plan to get there.
        </p>

        {/* Divider */}
        <div className="w-16 h-px bg-[var(--card-border)] mb-8" />

        {/* Three felt experiences */}
        <div className="w-full max-w-xs space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">⏳</span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              The urgent crowds out the important — every day.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">🎯</span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              You set goals. Life happens. You start over.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">❓</span>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              You wonder if you are making any real progress.
            </p>
          </div>
        </div>

        {/* Better way */}
        <p className="text-[var(--text-primary)] text-center text-base font-semibold max-w-xs mb-8 leading-snug">
          There is a better way to live. It starts with one consistent day.
        </p>

        {/* Primary CTA */}
        <button
          onClick={scrollToForm}
          className="w-full max-w-xs py-4 rounded-xl font-bold text-white text-lg bg-[#275578] hover:bg-[#1e4068] transition-colors"
        >
          Begin my journey →
        </button>

        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          Free during Alpha. Invite only.
        </p>

      </section>

      {/* ── Section 2 — Sign-up form ─────────────────────────────────────── */}
      <section ref={formRef} className="flex flex-col items-center px-6 py-16">

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[var(--card-border)] p-6">

          <p className="text-xs italic text-[var(--text-muted)] text-center mb-4">
            You are one step away from beginning your journey.
          </p>

          <SignUp
            forceRedirectUrl="/onboarding"
            appearance={clerkAppearance}
          />

          <p className="text-xs italic text-[var(--text-muted)] text-center mt-5 leading-relaxed">
            &ldquo;He who calls you is faithful; he will surely do it.&rdquo;
            <br />— 1 Thessalonians 5:24
          </p>

        </div>

      </section>

      {/* ── Section 3 — How it works ─────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="max-w-lg mx-auto">

          {/* Level cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">

            <div className="bg-white border border-[var(--card-border)] rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🎵</div>
              <p className="font-bold text-[var(--text-primary)] text-sm mb-1">Tuning</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Seven days. Two pillars. One goal each. You begin.
              </p>
            </div>

            <div className="bg-white border border-[var(--card-border)] rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🎸</div>
              <p className="font-bold text-[var(--text-primary)] text-sm mb-1">Jamming</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Two weeks. Three pillars. Consistency becomes familiar.
              </p>
            </div>

            <div className="bg-white border border-[var(--card-border)] rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🎶</div>
              <p className="font-bold text-[var(--text-primary)] text-sm mb-1">Grooving</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Forty days. All four pillars. A new life is forming.
              </p>
            </div>

          </div>

          {/* Richard G. Scott quote */}
          <div className="text-center">
            <p className="italic text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm mx-auto">
              &ldquo;We become what we want to be by consistently being what we want to become each day.&rdquo;
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2">— Richard G. Scott</p>
          </div>

        </div>
      </section>

      {/* ── Sign-in link ─────────────────────────────────────────────────── */}
      <div className="text-center pb-16">
        <p className="text-sm text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-semibold text-[#275578] hover:text-[#1e4068] transition-colors">
            Sign in
          </Link>
        </p>
      </div>

    </main>
  )
}
