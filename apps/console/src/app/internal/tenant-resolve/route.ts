import { NextRequest, NextResponse } from 'next/server'

import { serverFunctionsAppOrigin } from '@/lib/functions-app-origin'

export const dynamic = 'force-dynamic'

/**
 * Same-origin helper for the client auth shell: returns whether this host is a Firestore-claimed
 * tenant API root (`username` for `/u/[username]`), without exposing Firebase uids to the browser.
 */
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host')?.trim()
  if (!host || process.env.ENABLE_FIRESTORE_TENANT_ROUTING !== 'true') {
    return NextResponse.json({ username: null })
  }

  const base = serverFunctionsAppOrigin()
  const headers: Record<string, string> = {}
  const k = process.env.CHRONOGROVE_INTERNAL_API_KEY?.trim()
  if (k) {
    headers['x-chronogrove-internal-key'] = k
  }

  try {
    const res = await fetch(
      `${base}/api/internal/resolve-tenant?${new URLSearchParams({ host })}`,
      { headers, cache: 'no-store' }
    )
    if (!res.ok) {
      return NextResponse.json({ username: null })
    }
    const j = (await res.json()) as { username?: string | null }
    const username =
      typeof j.username === 'string' && j.username.length > 0 ? j.username : null
    return NextResponse.json({ username })
  } catch {
    return NextResponse.json({ username: null })
  }
}
