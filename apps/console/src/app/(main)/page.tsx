import type { Metadata } from 'next'
import { OverviewSection } from '@/sections/OverviewSection'
import { getTenantDisplayHost } from '@/lib/tenantDisplay'

const tenantHost = getTenantDisplayHost()

export const metadata: Metadata = {
  title: tenantHost ? `Dashboard · ${tenantHost}` : 'Dashboard',
  description:
    'Live provider health, sync status, and key metrics for the Chronogrove console.',
}

export default function OverviewPage() {
  return <OverviewSection />
}
