'use client'

export interface ACTState {
  a: boolean  // Attainable
  c: boolean  // Challenging
  t: boolean  // Trackable
}

interface ACTChecklistProps {
  checked:   ACTState
  onChange:  (next: ACTState) => void
}

const ITEMS: { key: keyof ACTState; letter: string; label: string; description: string }[] = [
  {
    key:         'a',
    letter:      'A',
    label:       'Attainable',
    description: 'Can this be done on the worst day of the year?',
  },
  {
    key:         'c',
    letter:      'C',
    label:       'Challenging',
    description: 'Does it require genuine intention and effort?',
  },
  {
    key:         't',
    letter:      'T',
    label:       'Trackable',
    description: 'Is there a clear, binary way to confirm it was done?',
  },
]

export default function ACTChecklist({ checked, onChange }: ACTChecklistProps) {
  function toggle(key: keyof ACTState) {
    onChange({ ...checked, [key]: !checked[key] })
  }

  return (
    <div className="space-y-1.5 mt-2">
      {ITEMS.map(({ key, letter, label, description }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className="w-full flex items-start gap-2.5 text-left"
        >
          {/* Checkbox */}
          <span
            className={[
              'mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors',
              checked[key]
                ? 'bg-white border-white'
                : 'bg-transparent border-white/40',
            ].join(' ')}
          >
            {checked[key] && (
              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-slate-800">
                <path d="M1 4l3 3 5-6" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>

          {/* Label */}
          <span className="text-xs leading-snug">
            <span className="font-bold text-white">{letter} — {label}:</span>{' '}
            <span className="text-white/70">{description}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
