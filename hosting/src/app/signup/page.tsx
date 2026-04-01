import type { Metadata } from 'next'
import { AuthScenePageShell } from '@/components/AuthScenePageShell'
import { SignUpSection } from '@/sections/SignUpSection'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a Chronogrove account to sync your data from connected providers.',
}

export default function SignUpPage() {
  return (
    <AuthScenePageShell>
      <SignUpSection />
    </AuthScenePageShell>
  )
}
