import type { Metadata } from 'next'
import { AuthScene } from '@/components/AuthScene'
import { OnboardingSection } from '@/sections/OnboardingSection'

export const metadata: Metadata = {
  title: 'Onboarding',
  description: 'Set up your Chronogrove account — choose a username, connect providers, and configure your domain.',
}

export default function OnboardingPage() {
  return (
    <>
      <AuthScene />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <OnboardingSection />
      </div>
    </>
  )
}
