'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { AuthSection } from '@/sections/AuthSection'

const FloatingLines = dynamic(() => import('@/components/FloatingLines'), {
  ssr: false,
})

export default function AuthPage() {
  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          width: '100%',
          height: '100%',
        }}
        aria-hidden
      >
        <Suspense fallback={null}>
          <FloatingLines
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={5}
            lineDistance={5}
            bendRadius={5}
            bendStrength={-0.5}
            interactive={true}
            parallax={true}
          />
        </Suspense>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <AuthSection />
      </div>
    </>
  )
}
