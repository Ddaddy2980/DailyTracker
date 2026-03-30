'use client'

import { useState } from 'react'

interface Props {
  purposeStatement:  string
  isPending:         boolean
  onConfirm: (data: {
    purposeStatement:             string
    accountabilityPartnerName:    string | null
    accountabilityPartnerContact: string | null
  }) => void
  onBack: () => void
}

export default function JammingStepWarning({ purposeStatement, isPending, onConfirm, onBack }: Props) {
  const [purpose,      setPurpose]      = useState(purposeStatement)
  const [partnerName,  setPartnerName]  = useState('')
  const [partnerContact, setPartnerContact] = useState('')

  function handleConfirm() {
    onConfirm({
      purposeStatement:             purpose.trim(),
      accountabilityPartnerName:    partnerName.trim()  || null,
      accountabilityPartnerContact: partnerContact.trim() || null,
    })
  }

  return (
    <div className="flex flex-col gap-5 pt-8">

      {/* Warning card */}
      <div className="bg-amber-950 border-2 border-amber-700 rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Honest warning</p>
        <p className="text-white font-black text-lg leading-snug">
          Two pillars is harder than one.
        </p>
        <p className="text-amber-200 text-sm leading-relaxed">
          It&apos;s supposed to feel harder before it feels easier. That&apos;s not failure — that&apos;s Jamming.
          When it feels hard, that&apos;s the challenge working.
        </p>
      </div>

      {/* Pulse check intro */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Weekly pulse check</p>
        <p className="text-white text-sm font-semibold">Once a week we&apos;ll ask how you&apos;re doing.</p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Three options: Smooth Sailing, Rough Waters, or Taking On Water. Your answer adjusts the support you receive — notifications, coaching videos, and more.
        </p>
      </div>

      {/* Purpose statement */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Your why — does this still capture it?
        </label>
        <textarea
          rows={3}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-purple-500 transition-colors resize-none"
          placeholder="What does living on purpose mean to you?"
          value={purpose}
          onChange={e => setPurpose(e.target.value)}
        />
      </div>

      {/* Accountability partner */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Accountability partner <span className="text-slate-600 normal-case font-normal">— optional</span>
          </p>
          <p className="text-slate-500 text-xs leading-relaxed">
            One person who celebrates this with you. They&apos;ll see your weekly summary — not daily check-ins.
          </p>
        </div>
        <input
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-purple-500 transition-colors"
          placeholder="Their name (e.g. Sarah)"
          value={partnerName}
          onChange={e => setPartnerName(e.target.value)}
        />
        {partnerName.trim().length > 0 && (
          <input
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm outline-none focus:border-purple-500 transition-colors"
            placeholder="Email or phone number"
            value={partnerContact}
            onChange={e => setPartnerContact(e.target.value)}
          />
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isPending}
          className="px-6 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl font-bold transition-colors"
        >
          ←
        </button>
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 rounded-xl font-bold text-lg transition-colors"
        >
          {isPending ? 'Starting Jamming…' : "Let's Jam →"}
        </button>
      </div>

    </div>
  )
}
