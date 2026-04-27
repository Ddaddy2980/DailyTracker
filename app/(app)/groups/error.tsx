'use client'

export default function GroupsError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#EBEBEC] px-6 gap-4">
      <p className="text-slate-700 font-semibold text-center">Something went wrong loading groups.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-slate-700 text-white rounded-xl text-sm font-medium"
      >
        Try again
      </button>
    </div>
  )
}
