'use client'

import { useEffect, useState } from 'react'
import type { SectionId } from '../layout/Layout'
import { useAuth } from '../auth/AuthContext'
import { ApiClient } from '../auth/apiClient'
import { getAppBaseUrl, getManualSyncStreamUrl } from '../lib/baseUrl'
import { readDiscogsAuthModeFromSyncPayload } from '../lib/readDiscogsAuthModeFromSyncPayload'
import { readFlickrAuthModeFromSyncPayload } from '../lib/readFlickrAuthModeFromSyncPayload'
import { readGitHubAuthModeFromWidgetResponse } from '../lib/readGitHubAuthModeFromWidgetResponse'
import styles from './ApiTestingSection.module.css'

const WIDGET_PROVIDERS = ['discogs', 'flickr', 'github', 'goodreads', 'instagram', 'spotify', 'steam'] as const
const SYNC_PROVIDERS = ['spotify', 'steam', 'goodreads', 'instagram', 'discogs', 'flickr'] as const

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
  /** Single live status line for the active SSE sync stream. */
  const [syncThinkingLine, setSyncThinkingLine] = useState<string | null>(null)
  const [loading, setLoading] = useState<LoadingState>({
    widgets: false,
    session: false,
    sync: false,
  })
  const baseUrl = getAppBaseUrl()
  const apiClient = new ApiClient(baseUrl)

  useEffect(() => {
    if (!user) {
      setIdToken(null)
      return
    }
    let cancelled = false
    user
      .getIdToken()
      .then((token) => {
        if (!cancelled) setIdToken(token)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  const showApi = activeSection === 'api'
  const showSync = activeSection === 'sync'
  const syncFlickrAuthMode =
    showSync && syncProvider === 'flickr' && syncResult?.ok
      ? readFlickrAuthModeFromSyncPayload(syncResult.data)
      : undefined
  const syncDiscogsAuthMode =
    showSync && syncProvider === 'discogs' && syncResult?.ok
      ? readDiscogsAuthModeFromSyncPayload(syncResult.data)
      : undefined
  const widgetGitHubAuthMode =
    showApi && widgetProvider === 'github' && widgetResult?.ok
      ? readGitHubAuthModeFromWidgetResponse(widgetResult.data)
      : undefined

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
      const headers: HeadersInit = {}
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`
      }
      const res = await fetch(`${baseUrl}/api/widgets/${widgetProvider}`, {
        credentials: 'include',
        cache: 'no-store',
        headers,
      })
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
    setSyncThinkingLine('Starting sync…')
    const start = Date.now()

    const applySseLine = (raw: string) => {
      const line = raw.replace(/\r$/, '')
      if (!line.startsWith('data: ')) return
      let payload: {
        type?: string
        message?: string
        result?: unknown
      }
      try {
        payload = JSON.parse(line.slice(6)) as typeof payload
      } catch {
        return
      }
      if (payload.type === 'progress' && typeof payload.message === 'string') {
        setSyncThinkingLine(payload.message)
      }
      if (payload.type === 'done') {
        setSyncResult({
          ok: true,
          status: 200,
          time: Date.now() - start,
          data: payload.result,
        })
      }
      if (payload.type === 'error') {
        setSyncResult({
          ok: false,
          time: Date.now() - start,
          error: typeof payload.message === 'string' ? payload.message : 'Sync stream error',
        })
      }
    }

    try {
      const res = await fetch(getManualSyncStreamUrl(syncProvider), {
        headers: { Authorization: `Bearer ${idToken}` },
        credentials: 'include',
        cache: 'no-store',
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        setSyncResult({
          ok: false,
          status: res.status,
          time: Date.now() - start,
          error: errText || `HTTP ${res.status}`,
        })
        setSyncThinkingLine(null)
        return
      }

      if (!res.body) {
        setSyncResult({
          ok: false,
          time: Date.now() - start,
          error: 'No response body (streaming not supported?)',
        })
        setSyncThinkingLine(null)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          applySseLine(part)
        }
      }
      if (buffer.trim()) {
        applySseLine(buffer)
      }
    } catch (err) {
      setSyncResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        time: Date.now() - start,
      })
    } finally {
      setSyncThinkingLine(null)
      setLoading((l) => ({ ...l, sync: false }))
    }
  }

  return (
    <>
      {showApi && (
        <>
          <div className={styles.block}>
            <h2 className={styles.sectionTitle}>Try API</h2>
            <p className={styles.sectionSubtitle}>
              Test the authenticated and public route surface from one place. Widget feeds are public; session and sync
              flows require sign-in.
            </p>
          </div>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Auth token</h3>
            <p className={styles.blockText}>
              Refresh the current Firebase ID token before calling protected routes.
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
            <p className={styles.sectionSubtitle}>
              When you are signed in, requests include your Firebase ID token so GitHub uses your linked account (OAuth)
              instead of the server PAT. Session cookies from <strong>Session → Test</strong> work too.
            </p>
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
              {widgetGitHubAuthMode ? (
                <p
                  className={`${styles.flickrAuthBadge} ${
                    widgetGitHubAuthMode === 'oauth'
                      ? styles.flickrAuthBadgeOAuth
                      : styles.flickrAuthBadgeLegacy
                  }`}
                  role="status"
                >
                  {widgetGitHubAuthMode === 'oauth'
                    ? 'GitHub credentials: OAuth (connected account)'
                    : 'GitHub credentials: PAT (server env / legacy)'}
                </p>
              ) : null}
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
              Trigger a provider sync from the console. Your ID token loads automatically after sign-in, and the API
              page can refresh it or create a session cookie when needed.
            </p>
          </div>
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>Sync provider</h3>
            <p className={styles.blockText}>
              Run the queue-backed sync via{' '}
              <code className={styles.inlineCode}>GET /api/widgets/sync/&#123;provider&#125;/stream</code>{' '}
              so you can watch live steps and inspect the same final payload returned by the JSON endpoint.
              {syncProvider === 'flickr' || syncProvider === 'discogs'
                ? ' Flickr and Discogs manual sync load OAuth from your signed-in user when that provider is linked; otherwise the job uses server env credentials. Widget data still updates the default site owner path.'
                : ''}
            </p>
            <div className={styles.endpoint}>
              <span className={styles.methodGet}>GET</span>
              <code className={styles.path}>/api/widgets/sync/&#123;provider&#125;/stream</code>
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
              {loading.sync && syncThinkingLine !== null ? (
                <div className={styles.thinkingShell} role="status" aria-live="polite">
                  <div className={styles.thinkingHeader}>
                    <span className={styles.thinkingPulse} aria-hidden />
                    <span className={styles.thinkingTitle}>Sync progress</span>
                    <span className={styles.thinkingDots} aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                  <p key={syncThinkingLine} className={styles.thinkingLine}>
                    {syncThinkingLine}
                  </p>
                </div>
              ) : null}
              {syncFlickrAuthMode ? (
                <p
                  className={`${styles.flickrAuthBadge} ${
                    syncFlickrAuthMode === 'oauth'
                      ? styles.flickrAuthBadgeOAuth
                      : styles.flickrAuthBadgeLegacy
                  }`}
                  role="status"
                >
                  {syncFlickrAuthMode === 'oauth'
                    ? 'Flickr credentials: OAuth (connected account)'
                    : 'Flickr credentials: legacy (server API key)'}
                </p>
              ) : null}
              {syncDiscogsAuthMode ? (
                <p
                  className={`${styles.flickrAuthBadge} ${
                    syncDiscogsAuthMode === 'oauth'
                      ? styles.flickrAuthBadgeOAuth
                      : styles.flickrAuthBadgeLegacy
                  }`}
                  role="status"
                >
                  {syncDiscogsAuthMode === 'oauth'
                    ? 'Discogs credentials: OAuth (connected account)'
                    : 'Discogs credentials: legacy (personal token + username in env)'}
                </p>
              ) : null}
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
