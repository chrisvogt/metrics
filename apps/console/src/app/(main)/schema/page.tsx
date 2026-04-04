import type { Metadata } from 'next'
import { SchemaSection } from '@/sections/SchemaSection'

export const metadata: Metadata = {
  title: 'Schema',
  description: 'Browse the Chronogrove schema, example payloads, and the public versus authenticated route surface.',
}

export default function SchemaPage() {
  return <SchemaSection />
}
