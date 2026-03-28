import type { Metadata } from 'next'
import { AuthScene } from '@/components/AuthScene'
import { AuthSection } from '@/sections/AuthSection'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to access the protected Chronogrove console, session helpers, and sync tools.',
}

export default function AuthPage() {
  return (
    <>
      <AuthScene />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AuthSection />
      </div>
    </>
  )
}
