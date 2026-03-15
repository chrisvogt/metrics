import { useState } from 'react'
import type { SectionId } from '../layout/Layout'
import { useAuth } from '../auth/AuthContext'
import { ApiClient } from '../auth/apiClient'
import styles from './ApiTestingSection.module.css'

const WIDGET_PROVIDERS = ['discogs', 'flickr', 'github', 'goodreads', 'instagram', 'spotify', 'steam'] as const
const SYNC_PROVIDERS = ['spotify', 'steam', 'goodreads', 'instagram', 'discogs', 'flickr'] as const

function useBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const h = window.location.hostname
  const isDev = h === 'localhost' || h === '127.0.0.1' || h === 'metrics.dev-chrisvogt.me'
  return isDev ? '' : 'https://metrics.chrisvogt.me'
}

export interface ApiTestingSectionProps {
  activeSection: SectionId
}

interface FetchResult {
  ok: boolean
  status?: number
  time: number
  data?: unknown
  error?: string
}

interface LoadingState {
  widgets: boolean
  session: boolean
  sync: boolean
}

export function ApiTestingSection({ activeSection }: ApiTestingSectionProps) {
  const { user } = useAuth()
  const [idToken, setIdToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [widgetProvider, setWidgetProvider] = useState<string>(WIDGET_PROVIDERS[0])
  const [syncProvider, setSyncProvider] = useState<string>(SYNC_PROVIDERS[0])
  const [widgetResult, setWidgetResult] = useState<FetchResult | null>(null)
  const [sessionResult, setSessionResult] = useState<FetchResult | null>(null)
  const [syncResult, setSyncResult] = useState<FetchResult | null>(null)
  const [loading, setLoading] = useState<LoadingState>({ widgets: false, session: false, sync: false })
  const baseUrl = useBaseUrl()
  const apiClient = new ApiClient(baseUrl)

  const showApi = activeSection === 'api'
  const showSync = activeSection === 'sync'

  const fetchToken = async () => {
    if (!user) return
    setTokenLoading(true)
    try {
      const token = await user.getIdToken(true)
      setIdToken(token)
    } finally {
      setTokenLoading(false)
    }
  }

  const testWidgets = async () => {
    setLoading((l) => ({ ...l, widgets: true }))
    setWidgetResult(null)
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl}/api/widgets/${widgetProvider}`, { credentials: 'include', cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      setWidgetResult({
        ok: res.ok,
        status: res.status,
        time: Date.now() - start,
        data,
      })
    } catch (err) {
      setWidgetResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        time: Date.now() - start,
      })
    } finally {
      setLoading((l) => ({ ...l, widgets: false }))
    }
  }

  const testSession = async () => {
    if (!idToken) return
    setLoading((l) => ({ ...l, session: true }))
    setSessionResult(null)
    const start = Date.now()
    try {
      setSessionResult({
        ok: true,
        status: 200,
        time: Date.now() - start,
        data: await apiClient.createSession(idToken),
      })
    } catch (err) {
      setSessionResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        time: Date.now() - start,
      })
    } finally {
      setLoading((l) => ({ ...l, session: false }))
    }
  }

  const testSync = async () => {
    if (!idToken) return
    setLoading((l) => ({ ...l, sync: true }))
    setSyncResult(null)
    const start = Date.now()
    try {
      const res = await fetch(`${baseUrl}/api/widgets/sync/${syncProvider}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      setSyncResult({
        ok: res.ok,
        status: res.status,
        time: Date.now() - start,
        data,
      })
    } catch (err) {
      setSyncResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        time: Date.now() - start,
      })
    } finally {
      setLoading((l) => ({ ...l, sync: false }))
    }
  }

  return (
    <>
      {showApi && (
        <>
          <div className={styles.block}>
            <h2 className={styles.sectionTitle}>API</h2>
            <p className={styles.sectionSubtitle}>
              Auth and widget endpoints. Get a token and session for protected calls; widget data is public.
            </p>
          </div>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Auth token</h3>
            <p className={styles.blockText}>
              Get a fresh ID token to call session and sync endpoints.
            </p>
            <div className={styles.row}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={fetchToken}
                disabled={tokenLoading}
              >
                {tokenLoading ? 'Getting token…' : 'Get fresh ID token'}
              </button>
              {idToken && (
                <span className={styles.tokenPreview}>
                  Token: <code>{idToken.slice(0, 40)}…</code>
                </span>
              )}
            </div>
          </div>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Session</h3>
            <div className={styles.endpoint}>
              <span className={styles.methodPost}>POST</span>
              <code className={styles.path}>/api/auth/session</code>
              <div className={styles.controls}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={testSession}
                  disabled={!idToken || loading.session}
                >
                  {loading.session ? 'Testing…' : 'Test'}
                </button>
              </div>
              {sessionResult && <ResultBox result={sessionResult} />}
            </div>
          </div>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Get widget data</h3>
            <div className={styles.endpoint}>
              <span className={styles.methodGet}>GET</span>
              <code className={styles.path}>/api/widgets/&#123;provider&#125;</code>
              <div className={styles.controls}>
                <select
                  value={widgetProvider}
                  onChange={(e) => setWidgetProvider(e.target.value)}
                  className={styles.select}
                >
                  {WIDGET_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={testWidgets}
                  disabled={loading.widgets}
                >
                  {loading.widgets ? 'Testing…' : 'Test'}
                </button>
              </div>
              {widgetResult && <ResultBox result={widgetResult} />}
            </div>
          </div>
        </>
      )}

      {showSync && (
        <>
          <div className={styles.block}>
            <h2 className={styles.sectionTitle}>Sync</h2>
            <p className={styles.sectionSubtitle}>
              Trigger a sync for a provider. Use the API page to get a token and create a session first.
            </p>
          </div>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Sync provider</h3>
            <div className={styles.endpoint}>
              <span className={styles.methodGet}>GET</span>
              <code className={styles.path}>/api/widgets/sync/&#123;provider&#125;</code>
              <div className={styles.controls}>
                <select
                  value={syncProvider}
                  onChange={(e) => setSyncProvider(e.target.value)}
                  className={styles.select}
                >
                  {SYNC_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={testSync}
                  disabled={!idToken || loading.sync}
                >
                  {loading.sync ? 'Testing…' : 'Test'}
                </button>
              </div>
              {syncResult && <ResultBox result={syncResult} />}
            </div>
          </div>
        </>
      )}
    </>
  )
}

interface ResultBoxProps {
  result: FetchResult
}

function ResultBox({ result }: ResultBoxProps) {
  const isOk = result.ok
  const status = result.status != null ? `${result.status}` : ''
  const time = result.time != null ? `${result.time}ms` : ''
  const body = result.data != null ? result.data : result.error

  return (
    <div className={`${styles.result} ${isOk ? styles.resultOk : styles.resultError}`}>
      <div className={styles.resultHeader}>
        <span className={styles.resultStatus}>
          {isOk ? '✓' : '✗'} {status} {time}
        </span>
      </div>
      <pre className={styles.resultBody}>
        {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
      </pre>
    </div>
  )
}
