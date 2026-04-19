'use client'

interface CompletionCountdownBannerProps {
  daysRemaining: number // 1–5
}

const MESSAGES: Record<number, { headline: string; sub: string }> = {
  5: { headline: '5 days left.', sub: 'The finish line is in sight. Keep showing up.' },
  4: { headline: '4 days left.', sub: "You're almost there. Don't let up now." },
  3: { headline: '3 days left.', sub: "Three more mornings. Three more chances to finish what you started." },
  2: { headline: '2 days left.', sub: "Give it everything you've got. You're so close." },
  1: { headline: 'Final day.', sub: 'Make it count. You showed up — now finish strong.' },
}

export default function CompletionCountdownBanner({ daysRemaining }: CompletionCountdownBannerProps) {
  const msg = MESSAGES[daysRemaining]
  if (!msg) return null

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)',
        boxShadow: '0 4px 0 rgba(0,0,0,0.2), 0 1px 6px rgba(0,0,0,0.12)',
      }}
    >
      <p className="text-base font-bold text-white leading-tight">{msg.headline}</p>
      <p className="text-sm text-blue-200 mt-0.5 leading-snug">{msg.sub}</p>
    </div>
  )
}
