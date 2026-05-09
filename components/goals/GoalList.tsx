interface GoalListProps {
  goals:    string[]
  saving:   boolean
  onRemove: (index: number) => void
}

export default function GoalList({ goals, saving, onRemove }: GoalListProps) {
  if (goals.length === 0) return null

  return (
    <ul className="space-y-2 mb-2">
      {goals.map((text, i) => (
        <li
          key={i}
          className="flex items-start gap-2 bg-white/10 rounded-lg px-3 py-2"
        >
          <span className="flex-1 text-sm text-white leading-snug">{text}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            disabled={saving}
            className="shrink-0 text-white/40 hover:text-white/80 transition-colors mt-0.5"
            aria-label="Remove goal"
          >
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
