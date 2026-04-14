import Image from 'next/image'
import BottomNav from '@/components/shared/BottomNav'
import UserAvatarMenu from '@/components/shared/UserAvatarMenu'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EBEBEC]">
      {/* Shared top bar — logo left, user avatar right */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-14">
        <Image
          src="/logo_2.png"
          alt="Daily Consistency Tracker"
          width={36}
          height={36}
          className="rounded-lg"
        />
        <UserAvatarMenu />
      </header>

      <div className="pb-24">{children}</div>
      <BottomNav />
    </div>
  )
}
