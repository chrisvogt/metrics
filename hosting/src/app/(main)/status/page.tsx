import type { Metadata } from 'next'
import { StatusSection } from '@/sections/StatusSection'

export const metadata: Metadata = {
  title: 'Status',
  description: 'Check public route health, latency, and payload-level sync timestamps across Chronogrove.',
}

export default function StatusPage() {
  return <StatusSection />
}
