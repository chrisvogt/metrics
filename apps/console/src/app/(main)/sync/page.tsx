import type { Metadata } from 'next'
import { ApiTestingSection } from '@/sections/ApiTestingSection'

export const metadata: Metadata = {
  title: 'Sync',
  description: 'Run authenticated provider syncs and watch live progress events in the Chronogrove dashboard.',
}

export default function SyncPage() {
  return <ApiTestingSection activeSection="sync" />
}
