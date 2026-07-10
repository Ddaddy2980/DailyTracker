import type { PillarName } from '@/lib/types'

// One arc per required pillar. Arc share ∝ that pillar's goal count; fill ∝ goals
// done. Segment math is ported verbatim from the v4 mockup's redrawHero().

export interface HeroRingSegment {
  pillar: PillarName
  total:  number   // required (active) duration goals in this pillar
  done:   number   // completed today
  color:  string   // PILLAR_CONFIG[pillar].title
}

interface HeroRingProps {
  segments: HeroRingSegment[]
  size?:    number
}

const RADIUS = 41
const STROKE = 9
const GAP = 6                              // px of visual separation between arcs
const CIRC = 2 * Math.PI * RADIUS          // ≈ 257.6

interface SegGeom {
  color:        string
  dasharray:    string
  dashoffset:   number
}

function computeSegments(segments: HeroRingSegment[]): { geoms: SegGeom[]; pct: number } {
  const totalGoals = segments.reduce((a, s) => a + s.total, 0)
  if (totalGoals === 0) return { geoms: [], pct: 0 }

  const geoms: SegGeom[] = []
  let offset = 0
  for (const s of segments) {
    const share = (s.total / totalGoals) * CIRC
    const fill = s.total > 0 ? (s.done / s.total) * share : 0
    if (fill > 0) {
      geoms.push({
        color:      s.color,
        dasharray:  `${Math.max(fill - GAP, 2)} ${CIRC - fill + GAP}`,
        dashoffset: -offset,
      })
    } else {
      geoms.push({ color: s.color, dasharray: `${CIRC}`, dashoffset: CIRC })
    }
    offset += share
  }

  const doneGoals = segments.reduce((a, s) => a + s.done, 0)
  return { geoms, pct: Math.round((doneGoals / totalGoals) * 100) }
}

export function HeroRing({ segments, size = 96 }: HeroRingProps) {
  const { geoms, pct } = computeSegments(segments)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />
        {geoms.map((g, i) => (
          <circle
            key={i}
            className="hero-seg"
            cx="48"
            cy="48"
            r={RADIUS}
            fill="none"
            stroke={g.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={g.dasharray}
            strokeDashoffset={g.dashoffset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b className="text-[20px] leading-none text-slate-800 tabular-nums">{pct}%</b>
        <small className="text-[9px] tracking-[0.06em] uppercase text-slate-400 mt-0.5">today</small>
      </div>
    </div>
  )
}
