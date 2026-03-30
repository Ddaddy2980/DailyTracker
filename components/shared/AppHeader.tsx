'use client'

import Image from 'next/image'
import { UserButton } from '@clerk/nextjs'

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[var(--card-border)] px-4 py-3 flex items-center justify-between">
      <Image src="/Logo.png" width={36} height={36} alt="Altared Life" className="shrink-0" />
      <p className="text-base font-semibold text-[var(--text-primary)]">
        Daily Consistency Tracker
      </p>
      <UserButton />
    </header>
  )
}
