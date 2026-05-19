import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { ProfilePictureProvider } from '@/components/profile-picture-context'
import { TourProvider } from '@/components/tour/tour-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <ProfilePictureProvider>
      <TourProvider>
        <div className="min-h-screen text-white flex" style={{ background: '#0d0d0d' }}>
          <Sidebar userEmail={user.email} />
          <main className="flex-1 min-h-screen" style={{ marginLeft: 'calc(16rem + 12px)' }}>
            {children}
          </main>
        </div>
      </TourProvider>
    </ProfilePictureProvider>
  )
}
