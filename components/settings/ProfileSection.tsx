import Link from 'next/link'

export default function ProfileSection() {
  return (
    <section className="bg-white rounded-2xl px-5 py-5 shadow-sm mb-4">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Consistency Profile</h2>
      <p className="text-xs text-slate-400 mb-4">
        Retake the questionnaire to reassess your starting level for each pillar.
      </p>
      <Link
        href="/onboarding/profile?retake=1"
        className="inline-block w-full text-center py-3 rounded-xl bg-slate-800 text-white text-sm font-semibold shadow-[0_4px_0_rgba(0,0,0,0.25)] active:shadow-[0_2px_0_rgba(0,0,0,0.25)] active:translate-y-0.5 transition-all duration-75"
      >
        Retake Consistency Profile Questionnaire
      </Link>
    </section>
  )
}
