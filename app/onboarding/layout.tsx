'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'

const STEP_PATHS: Record<string, number> = {
  '/onboarding/duration': 1,
  '/onboarding/videos':   2,
  '/onboarding/profile':  3,
  '/onboarding/goals':    4,
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentStep = STEP_PATHS[pathname] ?? 0
  const totalSteps = 4

  return (
    <div className="min-h-screen bg-[#EBEBEC] flex flex-col">
      {/* Header */}
      <header className="flex flex-col items-center pt-8 pb-4 px-4">
        <Image
          src="/Logo.png"
          alt="Daily Consistency Tracker"
          width={120}
          height={48}
          className="object-contain"
          priority
        />

        {currentStep > 0 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">
              Step {currentStep} of {totalSteps}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }, (_, i) => {
                const step = i + 1
                return (
                  <div
                    key={step}
                    className={[
                      'w-2 h-2 rounded-full transition-colors',
                      step < currentStep
                        ? 'bg-slate-700'
                        : step === currentStep
                        ? 'bg-slate-900'
                        : 'bg-slate-300',
                    ].join(' ')}
                  />
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        {children}
      </main>
    </div>
  )
}
