import type { Metadata } from 'next'
import { AuthScenePageShell } from '@/components/AuthScenePageShell'
import { UserSettingsSection } from '@/sections/UserSettingsSection'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Chronogrove account appearance and preferences.',
}

export default function UserSettingsPage() {
  return (
    <AuthScenePageShell>
      <UserSettingsSection />
    </AuthScenePageShell>
  )
}
