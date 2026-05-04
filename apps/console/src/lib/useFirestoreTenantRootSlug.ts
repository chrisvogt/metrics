'use client'

import { useEffect, useState } from 'react'

import { isTenantApiRootHostname } from '@/lib/tenant-api-root-map'

export function readEnableFirestorePublicRoot(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_FIRESTORE_TENANT_ROUTING === 'true'
}

/**
 * When Firestore tenant routing is enabled, resolves public username slug for `/` on hosts
 * not listed in the env tenant map (via same-origin `/internal/tenant-resolve`).
 */
export function useFirestoreTenantRootSlug(pathname: string): string | null {
  const [slug, setSlug] = useState<string | null>(null)
  const enabled = readEnableFirestorePublicRoot()

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      setSlug(null)
      return
    }
    const host = window.location.hostname
    if (pathname !== '/' && pathname !== '') {
      setSlug(null)
      return
    }
    if (isTenantApiRootHostname(host)) {
      setSlug(null)
      return
    }

    let cancelled = false
    void fetch(`/internal/tenant-resolve?host=${encodeURIComponent(host)}`)
      .then((r) => r.json())
      .then((j: { username?: string | null }) => {
        if (cancelled) return
        const u = j.username
        setSlug(typeof u === 'string' && u.length > 0 ? u : null)
      })
      .catch(() => {
        if (!cancelled) setSlug(null)
      })

    return () => {
      cancelled = true
    }
  }, [pathname, enabled])

  return slug
}
