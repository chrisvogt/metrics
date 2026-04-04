import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import { AuthScenePageShell } from '@/components/AuthScenePageShell'
import { VerifyEmailSection } from '@/sections/VerifyEmailSection'

export const metadata: Metadata = {
  title: 'Verify email',
  description: 'Confirm your email address to use the Chronogrove console.',
}

function VerifyFallback(): ReactNode {
  return (
    <section style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1rem' }}>
      <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </section>
  )
}

export default function VerifyEmailPage() {
  return (
    <AuthScenePageShell>
      <Suspense fallback={<VerifyFallback />}>
        <VerifyEmailSection />
      </Suspense>
    </AuthScenePageShell>
  )
}
