'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/auth/AuthContext'
import { getAppBaseUrl } from '../lib/baseUrl'
import { AddProvidersFlyout } from '@/components/onboarding/AddProvidersFlyout'
import {
  extractLastSynced,
  extractOverviewMetrics,
  type MetricItem,
} from '../lib/overviewMetrics'
import { getTenantDisplayHost } from '../lib/tenantDisplay'
import styles from './OverviewSection.module.css'

interface ProviderConfig {
  id: string
  label: string
  accent: string
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'github', label: 'GitHub', accent: '#c5ceff' },
  { id: 'goodreads', label: 'Goodreads', accent: '#e9c46a' },
  { id: 'spotify', label: 'Spotify', accent: '#1db954' },
  { id: 'instagram', label: 'Instagram', accent: '#f77737' },
  { id: 'steam', label: 'Steam', accent: '#67d9ff' },
  { id: 'discogs', label: 'Discogs', accent: '#c5ceff' },
  { id: 'flickr', label: 'Flickr', accent: '#ff0084' },
]

const QUICK_LINKS = [
  { href: '/schema/', label: 'Schema' },
  { href: '/status/', label: 'Status' },
  { href: '/sync/', label: 'Sync' },
  { href: '/auth/', label: 'Sign in' },
]

interface ProviderState {
  loading: boolean
  ok: boolean | null
  ms: number | null
  metrics: MetricItem[]
  lastSynced: string | null
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return '—'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const initialState = (): ProviderState => ({
  loading: true,
  ok: null,
  ms: null,
  metrics: [],
  lastSynced: null,
})

export function OverviewSection() {
  const { user, apiSessionReady } = useAuth()
  const baseUrl = getAppBaseUrl()
  const [states, setStates] = useState<Record<string, ProviderState>>({})
  const [addProvidersOpen, setAddProvidersOpen] = useState(false)

  useEffect(() => {
    if (!user) setAddProvidersOpen(false)
  }, [user])

  const fetchAll = useCallback(async () => {
    setStates(Object.fromEntries(PROVIDERS.map((p) => [p.id, initialState()])))
    await Promise.all(
      PROVIDERS.map(async (p) => {
        const start = performance.now()
        try {
          const res = await fetch(`${baseUrl}/api/widgets/${p.id}`, {
            cache: 'no-store',
            credentials: 'omit',
          })
          const ms = Math.round(performance.now() - start)
          let metrics: MetricItem[] = []
          let lastSynced: string | null = null
          if (res.ok) {
            const ct = res.headers.get('content-type') ?? ''
            if (ct.includes('application/json')) {
              const data = await res.json().catch(() => null)
              metrics = extractOverviewMetrics(data)
              lastSynced = extractLastSynced(data)
            }
          }
          setStates((prev) => ({
            ...prev,
            [p.id]: { loading: false, ok: res.ok, ms, metrics, lastSynced },
          }))
        } catch {
          const ms = Math.round(performance.now() - start)
          setStates((prev) => ({
            ...prev,
            [p.id]: { loading: false, ok: false, ms, metrics: [], lastSynced: null },
          }))
        }
      })
    )
  }, [baseUrl])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    if (typeof window === 'undefined' || !user || !apiSessionReady) return
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get('oauth')
    const openFlyout =
      params.get('providers') === 'open' ||
      ((oauth === 'flickr' || oauth === 'discogs') &&
        (params.get('status') === 'success' || params.get('status') === 'error'))
    if (!openFlyout) return

    setAddProvidersOpen(true)
    void fetchAll()

    params.delete('providers')
    params.delete('oauth')
    params.delete('status')
    params.delete('reason')
    const rest = params.toString()
    const clean = `${window.location.pathname}${rest ? `?${rest}` : ''}`
    window.history.replaceState(null, '', clean)
  }, [user, apiSessionReady, fetchAll])

  const resolved = Object.values(states)
  const healthy = resolved.filter((s) => s.ok === true).length
  const total = PROVIDERS.length
  const allDone = resolved.length === total && resolved.every((s) => !s.loading)

  const tenantHost = getTenantDisplayHost()

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.label}>chronogrove · core</p>
          <h1 className={styles.title}>{tenantHost || 'This site'}</h1>
          <p className={styles.meta}>
            {!allDone
              ? `${total} providers`
              : `${healthy} of ${total} providers healthy`}
          </p>
          <nav className={styles.quickLinks} aria-label="Quick navigation">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={styles.quickLink}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        {user ? (
          <div className={styles.heroAside}>
            <button
              type="button"
              className={styles.addProviderBtn}
              onClick={() => setAddProvidersOpen(true)}
            >
              Add a provider
            </button>
          </div>
        ) : null}
      </div>

      <AddProvidersFlyout
        open={addProvidersOpen}
        onClose={() => setAddProvidersOpen(false)}
        onSaved={() => void fetchAll()}
      />

      <div className={styles.grid}>
        {PROVIDERS.map((provider, index) => {
          const s = states[provider.id] ?? initialState()
          return (
            <article
              key={provider.id}
              className={`${styles.card} ${s.loading ? styles.cardLoading : ''}`}
              style={
                {
                  '--delay': String(index * 72),
                  '--card-accent': provider.accent,
                } as React.CSSProperties
              }
            >
              <div className={styles.cardHeader}>
                <span className={styles.providerName}>{provider.label}</span>
                <span
                  className={`${styles.dot} ${
                    s.loading
                      ? styles.dotPending
                      : s.ok
                        ? styles.dotOk
                        : styles.dotBad
                  }`}
                  role="img"
                  aria-label={s.loading ? 'checking' : s.ok ? 'healthy' : 'error'}
                />
              </div>

              {s.loading ? (
                <div className={styles.skeleton}>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLine} style={{ width: '55%' }} />
                </div>
              ) : s.metrics.length > 0 ? (
                <ul className={styles.metricList}>
                  {s.metrics.map((m) => (
                    <li key={m.displayName} className={styles.metric}>
                      <span className={styles.metricValue}>{m.value.toLocaleString()}</span>
                      <span className={styles.metricLabel}>{m.displayName}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.noData}>
                  {s.ok ? 'Live — no stored metrics' : 'Unavailable'}
                </p>
              )}

              <div className={styles.cardFooter}>
                <span className={styles.latency}>
                  {s.loading ? '—' : s.ms != null ? `${s.ms}ms` : '—'}
                </span>
                <span className={styles.synced}>
                  {s.loading ? '—' : formatRelative(s.lastSynced)}
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
