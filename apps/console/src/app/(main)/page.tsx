import type { Metadata } from 'next'
import { OverviewSection } from '@/sections/OverviewSection'
import { getTenantDisplayHost } from '@/lib/tenantDisplay'

const tenantHost = getTenantDisplayHost()

export const metadata: Metadata = {
  title: tenantHost ? `Overview · ${tenantHost}` : 'Overview',
  description:
    'Live provider health, sync status, and key metrics for this Chronogrove deployment.',
}

export default function OverviewPage() {
  return <OverviewSection />
}
