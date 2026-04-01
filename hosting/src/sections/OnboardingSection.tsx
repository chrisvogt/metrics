'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { apiClient } from '../auth/apiClient'
import { useAuth } from '../auth/AuthContext'
import { getAppBaseUrl } from '../lib/baseUrl'
import styles from './OnboardingSection.module.css'

const STEPS = [
  { id: 'username', label: 'Username' },
  { id: 'connections', label: 'Connections' },
  { id: 'domain', label: 'Custom domain' },
] as const

type StepId = (typeof STEPS)[number]['id']
type FlowStepId = StepId | 'done'

interface OnboardingProgressPayload {
  currentStep: FlowStepId
  completedSteps: StepId[]
  username: string | null
  connectedProviderIds: string[]
  customDomain: string | null
  updatedAt: string
}

const PROVIDERS = [
  { id: 'github', label: 'GitHub', icon: <GitHubIcon />, color: '#8b949e' },
  { id: 'discogs', label: 'Discogs', icon: <DiscogsIcon />, color: '#ff8800' },
  { id: 'spotify', label: 'Spotify', icon: <SpotifyIcon />, color: '#1db954' },
  { id: 'goodreads', label: 'Goodreads', icon: <GoodreadsIcon />, color: '#e0c68f' },
  { id: 'steam', label: 'Steam', icon: <SteamIcon />, color: '#66c0f4' },
  { id: 'flickr', label: 'Flickr', icon: <FlickrIcon />, color: '#ff0084' },
  { id: 'instagram', label: 'Instagram', icon: <InstagramIcon />, color: '#e4405f' },
] as const

type UsernameStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'error'
type DnsStatus = 'idle' | 'checking' | 'verified' | 'not-verified' | 'error'

const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/

function isStepId(v: string): v is StepId {
  return STEPS.some((s) => s.id === v)
}

function isFlowStepId(v: string): v is FlowStepId {
  return v === 'done' || isStepId(v)
}

export function OnboardingSection() {
  const { user, apiSessionReady } = useAuth()
  const [currentStep, setCurrentStep] = useState<FlowStepId>('username')
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set())
  const [hydrated, setHydrated] = useState(false)
  const [progressLoading, setProgressLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const suppressDraftSaveRef = useRef(true)

  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set())

  const [domain, setDomain] = useState('')
  const [dnsStatus, setDnsStatus] = useState<DnsStatus>('idle')
  const dnsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dnsPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const baseUrl = getAppBaseUrl()

  const checkUsername = useCallback(async (value: string) => {
    if (!value || !USERNAME_REGEX.test(value)) {
      setUsernameStatus(value.length > 0 ? 'invalid' : 'idle')
      return
    }

    setUsernameStatus('checking')
    try {
      const res = await fetch(
        `${baseUrl}/api/onboarding/check-username?username=${encodeURIComponent(value)}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Check failed')
      const data = await res.json() as { available?: boolean }
      setUsernameStatus(data.available ? 'available' : 'taken')
    } catch {
      setUsernameStatus('error')
    }
  }, [baseUrl])

  const buildSnapshot = useCallback(
    (overrides?: Partial<Pick<OnboardingProgressPayload, 'currentStep' | 'completedSteps'>>) => {
      const completedArr = overrides?.completedSteps ?? Array.from(completedSteps)
      const step = overrides?.currentStep ?? currentStep
      return {
        currentStep: step,
        completedSteps: completedArr,
        username: username.length > 0 ? username.toLowerCase() : null,
        connectedProviderIds: Array.from(connectedProviders),
        customDomain: domain.length > 0 ? domain : null,
      }
    },
    [completedSteps, connectedProviders, currentStep, domain, username]
  )

  const persistProgress = useCallback(
    async (snapshot: ReturnType<typeof buildSnapshot>) => {
      setSaving(true)
      setSaveError(null)
      try {
        const res = await apiClient.putJson('/api/onboarding/progress', snapshot)
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({} as { error?: string }))
          throw new Error(errBody.error ?? `Save failed (${res.status})`)
        }
        return true
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save progress.')
        return false
      } finally {
        setSaving(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!user) {
      setProgressLoading(false)
      setHydrated(true)
      return
    }

    if (!apiSessionReady) {
      setProgressLoading(true)
      return
    }

    let cancelled = false
    ;(async () => {
      setProgressLoading(true)
      try {
        const res = await apiClient.getJson('/api/onboarding/progress')
        if (!res.ok) throw new Error('Load failed')
        const data = await res.json() as {
          ok: boolean
          payload?: OnboardingProgressPayload
        }
        const p = data.payload
        if (cancelled || !p) return
        if (!isFlowStepId(p.currentStep)) {
          setCurrentStep('username')
        } else {
          setCurrentStep(p.currentStep)
        }
        setCompletedSteps(new Set(p.completedSteps.filter(isStepId)))
        const savedUsername = p.username ?? ''
        setUsername(savedUsername)
        setConnectedProviders(new Set(p.connectedProviderIds ?? []))
        setDomain(p.customDomain ?? '')
        setDnsStatus('idle')
        if (savedUsername.length >= 3) {
          queueMicrotask(() => void checkUsername(savedUsername))
        }
      } catch {
        if (!cancelled) setSaveError('Could not load saved progress. You can still continue.')
      } finally {
        if (!cancelled) {
          setProgressLoading(false)
          setHydrated(true)
          suppressDraftSaveRef.current = true
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, apiSessionReady, checkUsername])

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setUsername(sanitized)
    setUsernameStatus('idle')
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    if (sanitized.length >= 3) {
      usernameTimerRef.current = setTimeout(() => void checkUsername(sanitized), 500)
    }
  }

  const checkDns = useCallback(async (domainValue: string) => {
    if (!domainValue) return
    setDnsStatus('checking')
    try {
      const res = await fetch(
        `${baseUrl}/api/onboarding/check-domain?domain=${encodeURIComponent(domainValue)}`,
        { method: 'GET', credentials: 'include' }
      )
      if (!res.ok) throw new Error('Check failed')
      const data = await res.json() as { verified?: boolean }
      setDnsStatus(data.verified ? 'verified' : 'not-verified')
    } catch {
      setDnsStatus('error')
    }
  }, [baseUrl])

  const handleDomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9.-]/g, '')
    setDomain(sanitized)
    setDnsStatus('idle')
    if (dnsTimerRef.current) clearTimeout(dnsTimerRef.current)
    if (dnsPollingRef.current) clearInterval(dnsPollingRef.current)
  }

  const startDnsCheck = () => {
    if (!domain) return
    void checkDns(domain)
    if (dnsPollingRef.current) clearInterval(dnsPollingRef.current)
    dnsPollingRef.current = setInterval(() => void checkDns(domain), 15000)
  }

  useEffect(() => {
    return () => {
      if (dnsPollingRef.current) clearInterval(dnsPollingRef.current)
    }
  }, [])

  const handleStepComplete = async (step: StepId) => {
    setSaveError(null)
    const nextCompleted = new Set([...completedSteps, step])
    let nextFlow: FlowStepId = 'done'
    if (step !== 'domain') {
      const idx = STEPS.findIndex((s) => s.id === step)
      const next = STEPS[idx + 1]
      if (next) nextFlow = next.id
    }
    const snapshot = buildSnapshot({
      currentStep: nextFlow,
      completedSteps: Array.from(nextCompleted) as StepId[],
    })
    const ok = await persistProgress(snapshot)
    if (!ok) return
    setCompletedSteps(nextCompleted)
    setCurrentStep(nextFlow)
  }

  const navigateToStep = async (target: StepId) => {
    if (target === currentStep) return
    setSaveError(null)
    const snapshot = buildSnapshot({ currentStep: target })
    const ok = await persistProgress(snapshot)
    if (!ok) return
    setCurrentStep(target)
  }

  useEffect(() => {
    if (!user || !hydrated) return
    if (currentStep !== 'connections' && currentStep !== 'domain') return
    if (suppressDraftSaveRef.current) {
      suppressDraftSaveRef.current = false
      return
    }
    const t = setTimeout(() => {
      void persistProgress(buildSnapshot())
    }, 650)
    return () => clearTimeout(t)
  }, [user, hydrated, currentStep, connectedProviders, domain, buildSnapshot, persistProgress])

  const handleConnectProvider = (providerId: string) => {
    setConnectedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) next.delete(providerId)
      else next.add(providerId)
      return next
    })
  }

  const visualStepIndex =
    currentStep === 'done' ? STEPS.length - 1 : STEPS.findIndex((s) => s.id === currentStep)
  const safeVisualIndex = visualStepIndex >= 0 ? visualStepIndex : 0
  const progressPercent = ((safeVisualIndex + 1) / STEPS.length) * 100
  const stepMetaLabel = STEPS[safeVisualIndex]?.label ?? ''

  if (!user) {
    return (
      <section className={styles.section}>
        <div className={styles.card}>
          <h2 className={styles.heading}>Sign in required</h2>
          <p className={styles.subheading}>You need to be signed in to complete onboarding.</p>
        </div>
      </section>
    )
  }

  if (progressLoading) {
    return (
      <section className={styles.section}>
        <div className={styles.card}>
          <div className={styles.progressLoading}>
            <span className="spinner" aria-hidden />
            <p>Loading your progress…</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={`${styles.card} ${currentStep === 'done' ? styles.cardComplete : ''}`}>
        {currentStep === 'done' ? (
          <div className={styles.donePanel}>
            <span className={styles.doneEmoji} aria-hidden>
              🎉
            </span>
            <h2 className={styles.heading}>You&rsquo;re all set!</h2>
            <p className={styles.subheading}>
              Your Chronogrove account is ready. Head to the dashboard to start exploring your
              data.
            </p>
            <a href="/" className={styles.btnPrimary}>
              Go to dashboard
            </a>
          </div>
        ) : (
          <>
            <div className={styles.stepPosition} aria-live="polite">
              <span className={styles.stepPositionText}>
                <strong>Step {safeVisualIndex + 1}</strong> of {STEPS.length}
                <span className={styles.stepPositionSep}>·</span>
                {stepMetaLabel}
              </span>
              {saving && <span className={styles.savingBadge}>Saving…</span>}
            </div>

            <div
              className={styles.progressBarTrack}
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={safeVisualIndex + 1}
              aria-label="Onboarding steps completed"
            >
              <div
                className={styles.progressBarFill}
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>

            <div className={styles.stepIndicator}>
              {STEPS.map((step, i) => (
                <div key={step.id} className={styles.stepRow}>
                  <button
                    type="button"
                    className={`${styles.stepDot} ${
                      currentStep === step.id ? styles.stepDotActive : ''
                    } ${completedSteps.has(step.id) ? styles.stepDotDone : ''}`}
                    onClick={() => void navigateToStep(step.id)}
                    aria-current={currentStep === step.id ? 'step' : undefined}
                  >
                    {completedSteps.has(step.id) ? <CheckIcon /> : <span>{i + 1}</span>}
                  </button>
                  <span
                    className={`${styles.stepLabel} ${
                      currentStep === step.id ? styles.stepLabelActive : ''
                    }`}
                  >
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
                </div>
              ))}
            </div>

            {saveError && (
              <div className={styles.saveError} role="alert">
                {saveError}
              </div>
            )}

            {currentStep === 'username' && (
              <div className={styles.stepContent}>
            <h2 className={styles.heading}>Choose your username</h2>
            <p className={styles.subheading}>
              This will be your unique profile URL. Pick something memorable — you can&rsquo;t
              change it later.
            </p>

            <div className={styles.usernameField}>
              <div className={styles.usernameInputWrap}>
                <span className={styles.usernamePrefix}>chronogrove.com/u/</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={styles.usernameInput}
                  placeholder="your-username"
                  maxLength={30}
                  autoFocus
                />
                <span className={styles.usernameIndicator}>
                  {usernameStatus === 'checking' && <span className="spinner" aria-label="Checking…" />}
                  {usernameStatus === 'available' && <span className={styles.statusOk}>✓</span>}
                  {usernameStatus === 'taken' && <span className={styles.statusBad}>✕</span>}
                  {usernameStatus === 'invalid' && <span className={styles.statusBad}>✕</span>}
                  {usernameStatus === 'error' && <span className={styles.statusWarn}>!</span>}
                </span>
              </div>
              <div className={styles.usernameHint}>
                {usernameStatus === 'idle' && username.length < 3 && (
                  <span>3–30 characters. Letters, numbers, hyphens, and underscores.</span>
                )}
                {usernameStatus === 'checking' && <span>Checking availability…</span>}
                {usernameStatus === 'available' && (
                  <span className={styles.hintOk}>
                    <strong>{username}</strong> is available
                  </span>
                )}
                {usernameStatus === 'taken' && (
                  <span className={styles.hintBad}>
                    <strong>{username}</strong> is already taken
                  </span>
                )}
                {usernameStatus === 'invalid' && (
                  <span className={styles.hintBad}>
                    Must start and end with a letter or number.
                  </span>
                )}
                {usernameStatus === 'error' && (
                  <span className={styles.hintWarn}>
                    Could not check availability. Check your connection and try again.
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              className={styles.btnPrimary}
              disabled={usernameStatus !== 'available' || saving}
              onClick={() => void handleStepComplete('username')}
            >
              Continue
            </button>
            </div>
            )}

            {currentStep === 'connections' && (
          <div className={styles.stepContent}>
            <h2 className={styles.heading}>Connect your accounts</h2>
            <p className={styles.subheading}>
              Link the services you want to sync data from. You can always add more later from
              the dashboard.
            </p>

            <div className={styles.providerGrid}>
              {PROVIDERS.map((provider) => {
                const connected = connectedProviders.has(provider.id)
                return (
                  <button
                    key={provider.id}
                    type="button"
                    className={`${styles.providerCard} ${connected ? styles.providerConnected : ''}`}
                    onClick={() => handleConnectProvider(provider.id)}
                    style={{ '--provider-color': provider.color } as React.CSSProperties}
                  >
                    <span className={styles.providerIcon}>{provider.icon}</span>
                    <span className={styles.providerLabel}>{provider.label}</span>
                    <span className={styles.providerStatus}>
                      {connected ? (
                        <>
                          <span className={styles.connectedDot} />
                          Connected
                        </>
                      ) : (
                        'Connect'
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className={styles.stepActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={saving}
                onClick={() => void handleStepComplete('connections')}
              >
                Skip for now
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={saving}
                onClick={() => void handleStepComplete('connections')}
              >
                Continue
                {connectedProviders.size > 0 && (
                  <span className={styles.btnCount}>{connectedProviders.size}</span>
                )}
              </button>
            </div>
            </div>
            )}

            {currentStep === 'domain' && (
              <div className={styles.stepContent}>
            <h2 className={styles.heading}>Custom domain</h2>
            <p className={styles.subheading}>
              Point your own domain to Chronogrove for a branded API endpoint. This step is
              entirely optional — you can set this up anytime.
            </p>

            <label className={styles.label}>
              Domain name
              <input
                type="text"
                value={domain}
                onChange={(e) => handleDomainChange(e.target.value)}
                className={styles.domainInput}
                placeholder="api.yourdomain.com"
              />
            </label>

            {domain && (
              <div className={styles.dnsInstructions}>
                <p className={styles.dnsTitle}>Add these A records to your DNS provider:</p>
                <div className={styles.dnsRecords}>
                  <div className={styles.dnsRecord}>
                    <span className={styles.dnsType}>A</span>
                    <span className={styles.dnsHost}>{domain}</span>
                    <span className={styles.dnsArrow}>→</span>
                    <code className={styles.dnsValue}>151.101.65.195</code>
                  </div>
                  <div className={styles.dnsRecord}>
                    <span className={styles.dnsType}>A</span>
                    <span className={styles.dnsHost}>{domain}</span>
                    <span className={styles.dnsArrow}>→</span>
                    <code className={styles.dnsValue}>151.101.1.195</code>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.btnVerify}
                  onClick={startDnsCheck}
                  disabled={dnsStatus === 'checking'}
                >
                  {dnsStatus === 'checking' ? (
                    <>
                      <span className="spinner" aria-hidden />
                      Verifying…
                    </>
                  ) : (
                    'Verify DNS'
                  )}
                </button>

                {dnsStatus === 'verified' && (
                  <div className={styles.dnsResult}>
                    <span className={styles.statusOk}>✓</span>
                    <div>
                      <strong>DNS verified!</strong>
                      <p className={styles.dnsResultSub}>
                        Both A records are pointing to Chronogrove.
                      </p>
                    </div>
                  </div>
                )}

                {dnsStatus === 'not-verified' && (
                  <div className={styles.dnsResult}>
                    <span className={styles.statusPending}>⏳</span>
                    <div>
                      <strong>Not verified yet</strong>
                      <p className={styles.dnsResultSub}>
                        DNS changes can take up to 48 hours to propagate.
                        We&rsquo;ll keep checking every 15 seconds.
                      </p>
                    </div>
                  </div>
                )}

                {dnsStatus === 'error' && (
                  <div className={styles.dnsResult}>
                    <span className={styles.statusBad}>✕</span>
                    <div>
                      <strong>Verification failed</strong>
                      <p className={styles.dnsResultSub}>
                        Could not look up DNS records. Check the domain name and try again.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.stepActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={saving}
                onClick={() => void handleStepComplete('domain')}
              >
                Skip for now
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={saving}
                onClick={() => void handleStepComplete('domain')}
              >
                Finish setup
              </button>
            </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.607.069-.607 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  )
}

function DiscogsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}

function SpotifyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 11-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.452-1.493c3.632-1.102 8.147-.568 11.233 1.329a.78.78 0 01.256 1.073zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 11-.543-1.79c3.532-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.954 1.611z" />
    </svg>
  )
}

function GoodreadsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.5 14.5c0 .28-.22.5-.5.5h-4c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5h.5V9.75L9.25 11l-.75-.75L11 7.5h1.5v7.5h.5c.28 0 .5.22.5.5v1z" />
    </svg>
  )
}

function SteamIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.936 3.592 9.036 8.31 9.847l3.12-4.54a2.997 2.997 0 011.57-5.307 3 3 0 110 6 2.98 2.98 0 01-1.57-.447L10.88 21.7c.367.03.74.05 1.12.05 5.523 0 10-4.477 10-10S17.523 2 12 2zm3 11a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
  )
}

function FlickrIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="8" cy="12" r="4" fill="#0063dc" />
      <circle cx="16" cy="12" r="4" fill="#ff0084" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
