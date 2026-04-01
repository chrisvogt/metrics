import type { Metadata } from 'next'
import { AuthScene } from '@/components/AuthScene'
import { SignUpSection } from '@/sections/SignUpSection'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a Chronogrove account to sync your data from connected providers.',
}

export default function SignUpPage() {
  return (
    <>
      <AuthScene />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SignUpSection />
      </div>
    </>
  )
}
