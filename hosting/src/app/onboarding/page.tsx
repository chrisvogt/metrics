import type { Metadata } from 'next'
import { AuthScenePageShell } from '@/components/AuthScenePageShell'
import { OnboardingSection } from '@/sections/OnboardingSection'

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Set up your Chronogrove account — choose a username, connect providers, and configure your domain.',
}

export default function OnboardingPage() {
  return (
    <AuthScenePageShell>
      <OnboardingSection />
    </AuthScenePageShell>
  )
}
