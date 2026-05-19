import { SettingsProvider } from '@/components/settings-context'
import { DashboardShell } from '@/components/dashboard-shell'
import { ProfilePictureProvider } from '@/components/profile-picture-context'
import { TourProvider } from '@/components/tour/tour-provider'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ProfilePictureProvider>
        <TourProvider>
          <DashboardShell>{children}</DashboardShell>
        </TourProvider>
      </ProfilePictureProvider>
    </SettingsProvider>
  )
}
