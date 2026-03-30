'use client'

// =============================================================================
// GroupManageSheet — Phase 2.5 (Step 16f)
//
// Bottom sheet for group management.  Behaviour varies by group status:
//
//   active   → Rename · Toggle invite URL · ── · Pause · Archive* · Delete
//   paused   → Rename · Resume · ── · Archive* · Delete
//   archived → Rename · Reactivate · ── · Delete
//
// * Archive is presented as the default recommendation above Delete.
//
// Confirmation screens carry the exact copy specified in the product brief.
// =============================================================================

import { useState, useTransition } from 'react'
import type { GroupWithMembers } from '@/lib/types'
import {
  renameGroup,
  toggleGroupInviteUrl,
  pauseGroup,
  resumeGroup,
  archiveGroup,
  reactivateGroup,
  deleteGroup,
} from '@/app/actions-groups'

// ── Step union ────────────────────────────────────────────────────────────────

type SheetStep =
  | 'main'
  | 'rename'
  | 'confirm_pause'
  | 'confirm_resume'
  | 'confirm_archive'
  | 'confirm_reactivate'
  | 'confirm_delete'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  group:    GroupWithMembers
  onClose:  () => void     // called after any mutation or on explicit close
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GroupManageSheet({ group, onClose }: Props) {
  const [step, setStep]         = useState<SheetStep>('main')
  const [renameValue, setRenameValue] = useState(group.name)
  const [renameError, setRenameError] = useState('')
  const [isPending, startTransition]  = useTransition()

  // ── Action helpers ──────────────────────────────────────────────────────────

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action()
      onClose()
    })
  }

  function handleRename() {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenameError('Name cannot be empty'); return }
    if (trimmed.length > 30) { setRenameError('Max 30 characters'); return }
    run(() => renameGroup(group.id, trimmed))
  }

  // ── Backdrop + sheet ────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg bg-slate-900 rounded-t-3xl border border-slate-700 border-b-0 pb-safe">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* ── MAIN STEP ─────────────────────────────────────────────────── */}
        {step === 'main' && (
          <div className="px-5 pt-2 pb-8 space-y-1">
            <div className="mb-4">
              <p className="text-white font-bold text-base truncate">{group.name}</p>
              <p className="text-slate-500 text-xs capitalize">{group.status}</p>
            </div>

            {/* ── Active actions ── */}
            {group.status === 'active' && (
              <>
                <SheetButton onClick={() => setStep('rename')}>Rename</SheetButton>
                <SheetButton onClick={() => run(() => toggleGroupInviteUrl(group.id, !group.invite_url_enabled))}>
                  {group.invite_url_enabled ? 'Disable invite link' : 'Enable invite link'}
                </SheetButton>

                <div className="py-2">
                  <div className="border-t border-slate-800" />
                </div>

                <SheetButton onClick={() => setStep('confirm_pause')} subtle>
                  Pause group
                </SheetButton>

                {/* Archive — recommended, above Delete */}
                <button
                  onClick={() => setStep('confirm_archive')}
                  disabled={isPending}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                    bg-slate-800 hover:bg-slate-700 transition-colors text-left"
                >
                  <span className="text-white text-sm font-semibold">Archive group</span>
                  <span className="text-xs font-bold text-violet-400 bg-violet-950 border border-violet-800
                    rounded-md px-2 py-0.5">
                    Recommended
                  </span>
                </button>

                <SheetButton onClick={() => setStep('confirm_delete')} danger>
                  Delete group
                </SheetButton>
              </>
            )}

            {/* ── Paused actions ── */}
            {group.status === 'paused' && (
              <>
                <SheetButton onClick={() => setStep('rename')}>Rename</SheetButton>

                <div className="py-2">
                  <div className="border-t border-slate-800" />
                </div>

                <SheetButton onClick={() => setStep('confirm_resume')}>
                  Resume group
                </SheetButton>

                <button
                  onClick={() => setStep('confirm_archive')}
                  disabled={isPending}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl
                    bg-slate-800 hover:bg-slate-700 transition-colors text-left"
                >
                  <span className="text-white text-sm font-semibold">Archive group</span>
                  <span className="text-xs font-bold text-violet-400 bg-violet-950 border border-violet-800
                    rounded-md px-2 py-0.5">
                    Recommended
                  </span>
                </button>

                <SheetButton onClick={() => setStep('confirm_delete')} danger>
                  Delete group
                </SheetButton>
              </>
            )}

            {/* ── Archived actions ── */}
            {group.status === 'archived' && (
              <>
                <SheetButton onClick={() => setStep('rename')}>Rename</SheetButton>

                <div className="py-2">
                  <div className="border-t border-slate-800" />
                </div>

                <SheetButton onClick={() => setStep('confirm_reactivate')}>
                  Reactivate group
                </SheetButton>

                <SheetButton onClick={() => setStep('confirm_delete')} danger>
                  Delete group
                </SheetButton>
              </>
            )}

            <div className="pt-3">
              <SheetButton onClick={onClose} subtle>Cancel</SheetButton>
            </div>
          </div>
        )}

        {/* ── RENAME STEP ───────────────────────────────────────────────── */}
        {step === 'rename' && (
          <div className="px-5 pt-2 pb-8 space-y-4">
            <p className="text-white font-bold text-base">Rename group</p>

            <div className="space-y-1">
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={e => { setRenameValue(e.target.value); setRenameError('') }}
                maxLength={30}
                placeholder="Group name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                  text-white text-sm placeholder-slate-600 focus:outline-none focus:border-violet-500"
              />
              {renameError && (
                <p className="text-red-400 text-xs pl-1">{renameError}</p>
              )}
              <p className="text-slate-600 text-xs pl-1 text-right">
                {renameValue.trim().length}/30
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleRename}
                disabled={isPending}
                className="w-full py-3.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50
                  text-white font-bold rounded-2xl transition-colors text-sm active:scale-95"
              >
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <SheetButton onClick={() => setStep('main')} subtle>Back</SheetButton>
            </div>
          </div>
        )}

        {/* ── CONFIRM PAUSE ─────────────────────────────────────────────── */}
        {step === 'confirm_pause' && (
          <ConfirmSheet
            title="Pause this group?"
            body="Members won't be able to check in until you resume it. Your history is preserved."
            confirmLabel="Pause"
            confirmStyle="neutral"
            isPending={isPending}
            onConfirm={() => run(() => pauseGroup(group.id))}
            onBack={() => setStep('main')}
          />
        )}

        {/* ── CONFIRM RESUME ────────────────────────────────────────────── */}
        {step === 'confirm_resume' && (
          <ConfirmSheet
            title="Resume this group?"
            body="The group will become active again and members can resume checking in."
            confirmLabel="Resume"
            confirmStyle="neutral"
            isPending={isPending}
            onConfirm={() => run(() => resumeGroup(group.id))}
            onBack={() => setStep('main')}
          />
        )}

        {/* ── CONFIRM ARCHIVE ───────────────────────────────────────────── */}
        {step === 'confirm_archive' && (
          <ConfirmSheet
            title="Archive this group?"
            body="Your group and its history are saved. You can reactivate it anytime."
            confirmLabel="Archive"
            confirmStyle="neutral"
            isPending={isPending}
            onConfirm={() => run(() => archiveGroup(group.id))}
            onBack={() => setStep('main')}
          />
        )}

        {/* ── CONFIRM REACTIVATE ────────────────────────────────────────── */}
        {step === 'confirm_reactivate' && (
          <ConfirmSheet
            title="Reactivate this group?"
            body="The group will become active again. Members will be able to check in."
            confirmLabel="Reactivate"
            confirmStyle="neutral"
            isPending={isPending}
            onConfirm={() => run(() => reactivateGroup(group.id))}
            onBack={() => setStep('main')}
          />
        )}

        {/* ── CONFIRM DELETE ────────────────────────────────────────────── */}
        {step === 'confirm_delete' && (
          <ConfirmSheet
            title="Delete this group?"
            body="This permanently removes the group and cannot be undone. Consider archiving instead if you may want to restart later."
            confirmLabel="Delete permanently"
            confirmStyle="danger"
            isPending={isPending}
            onConfirm={() => run(() => deleteGroup(group.id))}
            onBack={() => setStep('main')}
          />
        )}

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A standard full-width sheet action button. */
function SheetButton({
  children,
  onClick,
  danger,
  subtle,
  disabled,
}: {
  children: React.ReactNode
  onClick:  () => void
  danger?:  boolean
  subtle?:  boolean
  disabled?: boolean
}) {
  const base = 'w-full px-4 py-3.5 rounded-xl text-sm font-semibold text-left transition-colors disabled:opacity-50'
  const style = danger
    ? 'bg-slate-800 hover:bg-red-950 text-red-400'
    : subtle
      ? 'text-slate-500 hover:text-slate-300'
      : 'bg-slate-800 hover:bg-slate-700 text-white'

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
      {children}
    </button>
  )
}

/** Reusable confirmation sub-screen. */
function ConfirmSheet({
  title,
  body,
  confirmLabel,
  confirmStyle,
  isPending,
  onConfirm,
  onBack,
}: {
  title:        string
  body:         string
  confirmLabel: string
  confirmStyle: 'neutral' | 'danger'
  isPending:    boolean
  onConfirm:    () => void
  onBack:       () => void
}) {
  const confirmClass = confirmStyle === 'danger'
    ? 'bg-red-700 hover:bg-red-600'
    : 'bg-violet-700 hover:bg-violet-600'

  return (
    <div className="px-5 pt-2 pb-8 space-y-5">
      <div className="space-y-2">
        <p className="text-white font-bold text-base">{title}</p>
        <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
      </div>

      <div className="space-y-2 pt-1">
        <button
          onClick={onConfirm}
          disabled={isPending}
          className={`w-full py-3.5 ${confirmClass} disabled:opacity-50
            text-white font-bold rounded-2xl transition-colors text-sm active:scale-95`}
        >
          {isPending ? 'Please wait…' : confirmLabel}
        </button>
        <button
          onClick={onBack}
          disabled={isPending}
          className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
