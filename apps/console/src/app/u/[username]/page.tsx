import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerWidgetFetchOrigin } from '@/lib/server-widget-fetch-origin'
import {
  WIDGET_STATUS_PROVIDERS,
  extractLastSyncedFromWidgetResponse,
} from '@/lib/widget-status'
import styles from './PublicTenantStatus.module.css'

type PageProps = {
  params: Promise<{ username: string }>
}

type RowResult = {
  label: string
  path: string
  httpStatus: number
  ok: boolean
  ms: number
  lastSynced: string | null
  error: string | null
}

async function fetchWidgetRow(
  origin: string,
  username: string,
  providerId: string,
  label: string
): Promise<RowResult> {
  const path = `/api/widgets/${providerId}?username=${encodeURIComponent(username)}`
  const started = Date.now()
  try {
    const res = await fetch(`${origin}${path}`, { cache: 'no-store' })
    const ms = Date.now() - started
    let lastSynced: string | null = null
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => null)
        lastSynced = extractLastSyncedFromWidgetResponse(data)
      }
    }
    return {
      label,
      path,
      httpStatus: res.status,
      ok: res.ok,
      ms,
      lastSynced,
      error: null,
    }
  } catch (err) {
    const ms = Date.now() - started
    return {
      label,
      path,
      httpStatus: 0,
      ok: false,
      ms,
      lastSynced: null,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function formatSynced(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  if (d.getTime() === 0) return '—'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} · status`,
    description: `Public widget API status for ${username} on Chronogrove.`,
    robots: { index: true, follow: true },
  }
}

export default async function PublicTenantStatusPage({ params }: PageProps) {
  const { username } = await params
  const origin = await getServerWidgetFetchOrigin()
  const rows = await Promise.all(
    WIDGET_STATUS_PROVIDERS.map((p) => fetchWidgetRow(origin, username, p.id, p.label))
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>@{username}</h1>
        <p className={styles.subtitle}>
          Public widget routes for this profile. Latency and{' '}
          <code className={styles.inlineCode}>meta.synced</code> come from each{' '}
          <code className={styles.inlineCode}>GET /api/widgets/:provider</code> response.
        </p>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Route</th>
              <th>Status</th>
              <th>Latency</th>
              <th>Last synced (payload)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const statusLabel = r.error ? 'Error' : String(r.httpStatus || '—')
              const okClass = r.ok ? styles.cellOk : r.error || !r.ok ? styles.cellBad : ''
              return (
                <tr key={r.path}>
                  <td>
                    <div>{r.label}</div>
                    <code className={styles.path}>{r.path}</code>
                  </td>
                  <td className={okClass}>
                    {r.error ? (
                      <span title={r.error}>—</span>
                    ) : (
                      statusLabel
                    )}
                  </td>
                  <td>{r.ms > 0 ? `${r.ms}ms` : '—'}</td>
                  <td className={styles.syncedCell}>{formatSynced(r.lastSynced)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <footer className={styles.footer}>
        Powered by{' '}
        <Link href="https://chronogrove.com" rel="noopener noreferrer">
          Chronogrove
        </Link>
      </footer>
    </div>
  )
}
