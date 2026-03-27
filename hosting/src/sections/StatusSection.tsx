import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getAppBaseUrl } from '../lib/baseUrl'
import styles from './StatusSection.module.css'

const WIDGET_ROUTES = [
  { id: 'discogs', label: 'Discogs widget' },
  { id: 'flickr', label: 'Flickr widget' },
  { id: 'github', label: 'GitHub widget' },
  { id: 'goodreads', label: 'Goodreads widget' },
  { id: 'instagram', label: 'Instagram widget' },
  { id: 'spotify', label: 'Spotify widget' },
  { id: 'steam', label: 'Steam widget' },
] as const

const CLIENT_AUTH_ROUTE = {
  id: 'client-auth-config',
  label: 'Client auth config',
  path: '/api/client-auth-config' as const,
} as const

type StatusRoute = (typeof WIDGET_ROUTES)[number] | typeof CLIENT_AUTH_ROUTE

export interface RowState {
  loading: boolean
  httpStatus: number | null
  ok: boolean | null
  ms: number | null
  lastSynced: string | null
  error: string | null
}

function pathForRow(row: StatusRoute): string {
  return 'path' in row ? row.path : `/api/widgets/${row.id}`
}

function extractLastSynced(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null
  const root = json as Record<string, unknown>
  const payload = root.payload
  if (!payload || typeof payload !== 'object') return null
  const meta = (payload as Record<string, unknown>).meta
  if (!meta || typeof meta !== 'object') return null
  const synced = (meta as Record<string, unknown>).synced
  if (synced == null) return null
  if (typeof synced === 'string') {
    const d = new Date(synced)
    return Number.isNaN(d.getTime()) ? synced : d.toISOString()
  }
  if (typeof synced === 'object' && synced !== null && '_seconds' in synced) {
    const sec = Number((synced as { _seconds?: unknown })._seconds)
    if (!Number.isFinite(sec)) return null
    const ns = Number((synced as { _nanoseconds?: unknown })._nanoseconds ?? 0)
    return new Date(sec * 1000 + ns / 1e6).toISOString()
  }
  return null
}

const initialRow = (): RowState => ({
  loading: true,
  httpStatus: null,
  ok: null,
  ms: null,
  lastSynced: null,
  error: null,
})

export function StatusSection() {
  const { user } = useAuth()
  const baseUrl = getAppBaseUrl()
  const activeRoutes = useMemo<readonly StatusRoute[]>(
    () => (user ? [...WIDGET_ROUTES, CLIENT_AUTH_ROUTE] : [...WIDGET_ROUTES]),
    [user]
  )
  const [rows, setRows] = useState<Record<string, RowState>>({})
  const [checking, setChecking] = useState(false)

  const runChecks = useCallback(async () => {
    setChecking(true)
    setRows(
      Object.fromEntries(activeRoutes.map((r) => [r.id, { ...initialRow(), loading: true }])) as Record<
        string,
        RowState
      >
    )

    await Promise.all(
      activeRoutes.map(async (r) => {
        const path = pathForRow(r)
        const start = performance.now()
        try {
          const res = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            credentials: 'omit',
            cache: 'no-store',
          })
          const ms = Math.round(performance.now() - start)
          let lastSynced: string | null = null
          if (res.ok) {
            const ct = res.headers.get('content-type') ?? ''
            if (ct.includes('application/json')) {
              const data = await res.json().catch(() => null)
              lastSynced = r.id === 'client-auth-config' ? null : extractLastSynced(data)
            }
          }
          setRows((prev) => ({
            ...prev,
            [r.id]: {
              loading: false,
              httpStatus: res.status,
              ok: res.ok,
              ms,
              lastSynced,
              error: null,
            },
          }))
        } catch (err) {
          const ms = Math.round(performance.now() - start)
          setRows((prev) => ({
            ...prev,
            [r.id]: {
              loading: false,
              httpStatus: null,
              ok: false,
              ms,
              lastSynced: null,
              error: err instanceof Error ? err.message : String(err),
            },
          }))
        }
      })
    )
    setChecking(false)
  }, [baseUrl, activeRoutes])

  useEffect(() => {
    void runChecks()
  }, [runChecks])

  const formatSynced = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    if (d.getTime() === 0) return '—'
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  return (
    <>
      <div className={styles.hero}>
        <h1 className={styles.title}>Status</h1>
        <p className={styles.lead}>
          Lightweight <code className={styles.inlineCode}>GET</code> checks for public widget routes (reads from
          storage where applicable). Last synced comes from{' '}
          <code className={styles.inlineCode}>meta.synced</code> in the widget payload when present; GitHub is fetched
          live and has no stored sync timestamp.
          {user ? (
            <>
              {' '}
              Signed-in view also checks <code className={styles.inlineCode}>/api/client-auth-config</code>.
            </>
          ) : (
            <>
              {' '}
              <span className={styles.leadMuted}>
                Sign in to include the client auth config route in this table.
              </span>
            </>
          )}
        </p>
        <button type="button" className={styles.refresh} onClick={() => void runChecks()} disabled={checking}>
          {checking ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Route</th>
              <th>HTTP</th>
              <th>Latency</th>
              <th>Last synced (payload)</th>
            </tr>
          </thead>
          <tbody>
            {activeRoutes.map((r) => {
              const s = rows[r.id] ?? initialRow()
              const statusLabel =
                s.loading ? '…' : s.error ? 'Error' : s.httpStatus != null ? String(s.httpStatus) : '—'
              const okClass =
                s.loading ? styles.pending : s.ok ? styles.cellOk : s.error || s.ok === false ? styles.cellBad : ''
              return (
                <tr key={r.id}>
                  <td>
                    <div className={styles.routeLabel}>{r.label}</div>
                    <code className={styles.path}>{pathForRow(r)}</code>
                  </td>
                  <td className={okClass}>
                    {!s.loading && s.error ? (
                      <span className={styles.errText} title={s.error}>
                        —
                      </span>
                    ) : (
                      statusLabel
                    )}
                  </td>
                  <td>{s.loading ? '…' : s.ms != null ? `${s.ms}ms` : '—'}</td>
                  <td className={styles.syncedCell}>{s.loading ? '…' : formatSynced(s.lastSynced)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
