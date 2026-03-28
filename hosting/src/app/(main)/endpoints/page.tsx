import type { Metadata } from 'next'
import { ApiTestingSection } from '@/sections/ApiTestingSection'

export const metadata: Metadata = {
  title: 'Try API',
  description: 'Test authenticated session and widget endpoints from the Chronogrove control surface.',
}

export default function EndpointsPage() {
  return <ApiTestingSection activeSection="api" />
}
