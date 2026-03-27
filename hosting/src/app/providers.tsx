'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/auth/AuthContext'

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
