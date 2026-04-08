import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerWidgetFetchOrigin } from '@/lib/server-widget-fetch-origin'
import {
  WIDGET_STATUS_PROVIDERS,
  fetchWidgetStatusRow,
  formatSyncedDisplay,
} from '@/lib/widget-status'
import styles from './PublicTenantStatus.module.css'

type PageProps = {
  params: Promise<{ username: string }>
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
    WIDGET_STATUS_PROVIDERS.map((p) => fetchWidgetStatusRow(origin, username, p.id, p.label))
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
                  <td className={styles.syncedCell}>{formatSyncedDisplay(r.lastSynced)}</td>
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
