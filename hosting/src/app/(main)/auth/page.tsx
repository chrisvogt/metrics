import type { Metadata } from 'next'
import { AuthScenePageShell } from '@/components/AuthScenePageShell'
import { AuthSection } from '@/sections/AuthSection'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to access the protected Chronogrove console, session helpers, and sync tools.',
}

export default function AuthPage() {
  return (
    <AuthScenePageShell>
      <AuthSection />
    </AuthScenePageShell>
  )
}
