'use client'

import { useState } from 'react'

interface Props {
  onNext: (purposeStatement: string) => void
}

export default function StepWelcome({ onNext }: Props) {
  const [purpose, setPurpose] = useState('')

  return (
    <div className="flex flex-col gap-8 pt-12">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-3xl bg-purple-600 flex items-center justify-center text-4xl shadow-lg shadow-purple-900">
          🎯
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-400">
          Daily Consistency Tracker
        </p>
        <h1 className="text-3xl font-black leading-tight">
          Living on Purpose
        </h1>
        <p className="text-slate-400 leading-relaxed">
          The daily habits you build today are the life you&apos;ll live tomorrow.
          This isn&apos;t about what you achieve — it&apos;s about who you become.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-300">
          Before we start — why does this matter to you?
        </label>
        <textarea
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none outline-none focus:border-purple-500 transition-colors"
          rows={3}
          placeholder="e.g. I want to honor God with my daily life and be present for my family."
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
          maxLength={200}
        />
        <p className="text-xs text-slate-500">
          This will be shown back to you on hard days. Be honest with yourself.
        </p>
      </div>

      <button
        onClick={() => onNext(purpose.trim())}
        disabled={purpose.trim().length < 5}
        className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors"
      >
        Begin my journey →
      </button>
    </div>
  )
}
