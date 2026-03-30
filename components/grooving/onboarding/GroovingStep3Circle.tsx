'use client'

import { useState, useTransition } from 'react'
import { markVideoWatched } from '@/app/actions'
import { VIDEO_LIBRARY } from '@/lib/constants'
import VideoCard from '@/components/challenge/VideoCard'

interface CircleMember {
  name:    string
  contact: string
}

interface Props {
  isPending:       boolean
  watchedVideoIds: string[]
  onConfirm:       (members: CircleMember[]) => void
  onBack:          () => void
}

export default function GroovingStep3Circle({ isPending, watchedVideoIds, onConfirm, onBack }: Props) {
  const [members, setMembers] = useState<CircleMember[]>([{ name: '', contact: '' }])
  const [watched, setWatched] = useState<Set<string>>(new Set(watchedVideoIds))
  const [, startTransition]   = useTransition()

  function handleVideoWatched(videoId: string) {
    setWatched(prev => new Set([...prev, videoId]))
    startTransition(async () => {
      await markVideoWatched(videoId, 'grooving_circle_setup')
    })
  }

  const g4 = VIDEO_LIBRARY.find(v => v.id === 'G4')

  function addMember() {
    if (members.length < 5) {
      setMembers(prev => [...prev, { name: '', contact: '' }])
    }
  }

  function removeMember(i: number) {
    setMembers(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateMember(i: number, field: keyof CircleMember, value: string) {
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m))
  }

  const validMembers = members.filter(m => m.name.trim().length > 0)

  function handleConfirm() {
    onConfirm(validMembers)
  }

  function handleSkip() {
    onConfirm([])
  }

  return (
    <div className="flex flex-col gap-5 pt-8">

      {/* G4 — Grooving Circle coaching, disappears once watched */}
      {g4 && !watched.has('G4') && (
        <VideoCard video={g4} watched={false} onWatched={handleVideoWatched} />
      )}

      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400">Grooving Circle</p>
        <h2 className="text-2xl font-black leading-tight">The people who finish feel witnessed</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          Consistency over 30–66 days is hard to sustain alone.
        </p>
      </div>

      <div className="bg-slate-900 border border-violet-800 rounded-2xl p-5 space-y-3">
        <p className="text-white text-sm font-semibold leading-relaxed">
          Add up to 5 people who will receive a quiet weekly summary of your consistency.
        </p>
        <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
          <p>They&apos;ll see: days completed per pillar, current streak, one optional reflection sentence.</p>
          <p>They won&apos;t see: your goals, pulse state, or personal notes.</p>
          <p>They don&apos;t need an account — they receive a simple weekly email or text.</p>
        </div>
      </div>

      {/* Member rows */}
      <div className="space-y-3">
        {members.map((member, i) => (
          <div key={i} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Person {i + 1}</p>
              {members.length > 1 && (
                <button
                  onClick={() => removeMember(i)}
                  className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
              placeholder="Their name (e.g. Sarah)"
              value={member.name}
              onChange={e => updateMember(i, 'name', e.target.value)}
            />
            {member.name.trim().length > 0 && (
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
                placeholder="Email or phone number"
                value={member.contact}
                onChange={e => updateMember(i, 'contact', e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {members.length < 5 && (
        <button
          onClick={addMember}
          className="w-full py-3 border border-dashed border-slate-700 rounded-2xl text-slate-400 hover:border-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
        >
          + Add another person
        </button>
      )}

      <p className="text-center text-xs text-slate-500 leading-relaxed px-2">
        This is optional — but research shows it&apos;s the strongest predictor of Grooving completion.
      </p>

      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-2xl font-black text-lg text-white transition-colors"
      >
        {isPending ? 'Starting Grooving…' : validMembers.length > 0 ? 'Start Grooving →' : 'Start Grooving without a Circle →'}
      </button>

      <div className="flex gap-3">
        <button onClick={onBack} disabled={isPending} className="flex-1 py-3 text-slate-400 hover:text-slate-300 text-sm transition-colors">
          ← Back
        </button>
        <button onClick={handleSkip} disabled={isPending} className="flex-1 py-3 text-slate-500 hover:text-slate-400 text-sm transition-colors">
          Skip for now
        </button>
      </div>

    </div>
  )
}
