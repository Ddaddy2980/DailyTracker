import Image from 'next/image'
import Link from 'next/link'
import { PILLAR_CONFIG } from '@/lib/constants'
import type { PillarName } from '@/lib/types'

// A quiet invitation row for a dormant pillar (active but no goals set) —
// muted, greyscaled, tapping goes to /goals to activate it. Copy is a
// placeholder ("Waiting for you") until David supplies final wording.

interface WhisperRowProps {
  pillar: PillarName
}

export function WhisperRow({ pillar }: WhisperRowProps) {
  const config = PILLAR_CONFIG[pillar]

  return (
    <Link
      href="/goals"
      className="flex items-center gap-2.5 rounded-xl bg-white/50 px-3.5 py-2.5"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-slate-300 opacity-75 grayscale">
        <Image src={config.icon} alt="" width={14} height={14} />
      </span>
      <span className="text-[12px] text-slate-500">{config.label}</span>
      <em className="ml-auto text-[11px] not-italic text-slate-400">Waiting for you ›</em>
    </Link>
  )
}
