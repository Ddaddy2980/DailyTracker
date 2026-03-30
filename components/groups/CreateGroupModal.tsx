'use client'

import { useState, useTransition } from 'react'
import { createGroup } from '@/app/actions-groups'
import type { ConsistencyGroup } from '@/lib/types'

interface Props {
  onCreated: (group: ConsistencyGroup) => void
  onClose:   () => void
}

type Step = 'input' | 'success'

export default function CreateGroupModal({ onCreated, onClose }: Props) {
  const [step, setStep]         = useState<Step>('input')
  const [name, setName]         = useState('')
  const [created, setCreated]   = useState<ConsistencyGroup | null>(null)
  const [copied, setCopied]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Give your group a name.'); return }
    if (trimmed.length > 30) { setError('Name must be 30 characters or less.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const group = await createGroup(trimmed)
        setCreated(group)
        setStep('success')
        onCreated(group)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      }
    })
  }

  function handleCopyCode() {
    if (!created) return
    void navigator.clipboard.writeText(created.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-white border border-[var(--card-border)] rounded-3xl p-6 space-y-5">

        {step === 'input' && (
          <>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-violet-600">New group</p>
              <p className="text-[var(--text-primary)] font-bold text-lg">Name your group</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                A short name your group will recognize — up to 30 characters.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                maxLength={30}
                placeholder="e.g. Morning Warriors"
                autoFocus
                className="w-full bg-gray-100 border border-[var(--card-border)] focus:border-violet-500 rounded-xl
                  px-4 py-3 text-[var(--text-primary)] text-sm placeholder-gray-400 focus:outline-none transition-colors"
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <p className="text-[var(--text-muted)] text-xs text-right">{name.length}/30</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-[var(--text-secondary)] font-semibold
                  rounded-2xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isPending}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                  disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors text-sm"
              >
                {isPending ? 'Creating…' : 'Create →'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && created && (
          <>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Group created</p>
              <p className="text-[var(--text-primary)] font-bold text-lg">{created.name}</p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Share this code with people you want to invite.
                They enter it on the 'Join a group' screen.
              </p>
            </div>

            {/* Invite code */}
            <div className="bg-gray-100 rounded-2xl px-5 py-4 text-center space-y-2">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Invite code</p>
              <p className="text-3xl font-black tracking-widest text-[var(--text-primary)] font-mono">
                {created.invite_code}
              </p>
              <button
                onClick={handleCopyCode}
                className="text-xs text-violet-600 hover:text-violet-500 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Tap to copy'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold
                rounded-2xl transition-colors text-sm"
            >
              Done
            </button>
          </>
        )}

      </div>
    </div>
  )
}
