'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from 'firebase/auth'
import { apiClient } from '@/auth/apiClient'
import { getAppBaseUrl } from '@/lib/baseUrl'
import { getOnboardingCnameTarget } from '@/lib/onboardingCnameTarget'
import { clearDnsVerificationTimers } from '@/lib/clearDnsVerificationTimers'
import { ONBOARDING_USERNAME_PATTERN } from '@/lib/onboardingConstraints'
import obStyles from '@/sections/OnboardingSection.module.css'
import settingsStyles from '@/sections/UserSettingsSection.module.css'

export interface OnboardingProgressPayload {
  currentStep: string
  completedSteps: string[]
  username: string | null
  connectedProviderIds: string[]
  integrationStatuses?: Record<string, string>
  customDomain: string | null
}

type DnsStatus = 'idle' | 'checking' | 'verified' | 'not-verified' | 'error'
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'

async function putOnboarding(
  user: User,
  body: {
    currentStep: string
    completedSteps: string[]
    username: string | null
    connectedProviderIds: string[]
    customDomain: string | null
  }
): Promise<{ ok: boolean; payload?: OnboardingProgressPayload; error?: string }> {
  const idToken = await user.getIdToken()
  const res = await apiClient.putJson('/api/onboarding/progress', body, { idToken })
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    payload?: OnboardingProgressPayload
    error?: string
  }
  if (!res.ok) {
    return { ok: false, error: data.error ?? `Request failed (${res.status})` }
  }
  return { ok: true, payload: data.payload }
}

function SettingsUsernameBlock({
  user,
  progress,
  baseUrl,
  onProgressUpdated,
  subsectionClassName,
}: {
  user: User
  progress: OnboardingProgressPayload
  baseUrl: string
  onProgressUpdated: (p: OnboardingProgressPayload) => void
  subsectionClassName: string
}) {
  const saved = (progress.username ?? '').toLowerCase()
  const [usernameDraft, setUsernameDraft] = useState(saved)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setUsernameDraft(saved)
    setUsernameStatus('idle')
    setMessage(null)
    setError(null)
  }, [saved])

  const checkUsername = useCallback(
    async (value: string) => {
      if (!value || !ONBOARDING_USERNAME_PATTERN.test(value)) {
        setUsernameStatus(value.length > 0 ? 'invalid' : 'idle')
        return
      }

      setUsernameStatus('checking')
      try {
        const headers: Record<string, string> = {}
        try {
          headers.Authorization = `Bearer ${await user.getIdToken()}`
        } catch {
          /* anonymous check */
        }
        const res = await fetch(
          `${baseUrl}/api/onboarding/check-username?username=${encodeURIComponent(value)}`,
          { credentials: 'include', headers }
        )
        if (!res.ok) throw new Error('Check failed')
        const data = (await res.json()) as { available?: boolean }
        setUsernameStatus(data.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('error')
      }
    },
    [baseUrl, user]
  )

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setUsernameDraft(sanitized)
    setUsernameStatus('idle')
    setError(null)
    setMessage(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    const normalized = sanitized.toLowerCase()
    if (normalized === saved) {
      return
    }
    if (sanitized.length >= 3) {
      timerRef.current = setTimeout(() => void checkUsername(sanitized), 500)
    }
  }

  const normalizedDraft = usernameDraft.toLowerCase()
  const clearingUsername = normalizedDraft === '' && saved.length > 0
  const unchanged = normalizedDraft === saved
  const canSaveUsername =
    !unchanged &&
    !saving &&
    (clearingUsername ||
      (ONBOARDING_USERNAME_PATTERN.test(usernameDraft) && usernameStatus === 'available'))

  const saveUsername = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    const nextUsername = usernameDraft.length > 0 ? usernameDraft.toLowerCase() : null
    const result = await putOnboarding(user, {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      username: nextUsername,
      connectedProviderIds: progress.connectedProviderIds,
      customDomain: progress.customDomain,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not save username.')
      return
    }
    if (result.payload) {
      onProgressUpdated(result.payload)
    }
    setMessage(nextUsername ? 'Username updated.' : 'Username removed.')
  }

  return (
    <div className={subsectionClassName}>
      <h2 className={settingsStyles.h2} id="settings-username-heading">
        Username
      </h2>
      <p className={settingsStyles.lede}>
        Your public profile slug. You can change it here any time; the new slug must be available.
      </p>

      <div className={obStyles.usernameField}>
        <div className={obStyles.usernameInputWrap}>
          <span className={obStyles.usernamePrefix}>chronogrove.com/u/</span>
          <input
            type="text"
            value={usernameDraft}
            onChange={(e) => handleUsernameChange(e.target.value)}
            className={obStyles.usernameInput}
            placeholder="your-username"
            maxLength={30}
            aria-labelledby="settings-username-heading"
          />
          <span className={obStyles.usernameIndicator}>
            {usernameStatus === 'checking' && (
              <span className="spinner" aria-label="Checking…" />
            )}
            {usernameStatus === 'available' && !unchanged && (
              <span className={obStyles.statusOk}>✓</span>
            )}
            {usernameStatus === 'taken' && <span className={obStyles.statusBad}>✕</span>}
            {usernameStatus === 'invalid' && <span className={obStyles.statusBad}>✕</span>}
            {usernameStatus === 'error' && <span className={obStyles.statusWarn}>!</span>}
          </span>
        </div>
        <div className={obStyles.usernameHint}>
          {unchanged && (
            <span>This is your current username. Edit the field to pick a new one.</span>
          )}
          {!unchanged && usernameStatus === 'idle' && usernameDraft.length < 3 && usernameDraft.length > 0 && (
            <span>3–30 characters. Letters, numbers, hyphens, and underscores.</span>
          )}
          {!unchanged && usernameStatus === 'idle' && usernameDraft.length === 0 && saved.length > 0 && (
            <span>Clearing the field removes your username claim (advanced).</span>
          )}
          {!unchanged && usernameStatus === 'checking' && <span>Checking availability…</span>}
          {!unchanged && usernameStatus === 'available' && (
            <span className={obStyles.hintOk}>
              <strong>{usernameDraft}</strong> is available
            </span>
          )}
          {!unchanged && usernameStatus === 'taken' && (
            <span className={obStyles.hintBad}>
              <strong>{usernameDraft}</strong> is already taken
            </span>
          )}
          {!unchanged && usernameStatus === 'invalid' && (
            <span className={obStyles.hintBad}>Must start and end with a letter or number.</span>
          )}
          {!unchanged && usernameStatus === 'error' && (
            <span className={obStyles.hintWarn}>
              Could not check availability. Check your connection and try again.
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className={obStyles.btnPrimary}
        disabled={!canSaveUsername}
        onClick={() => void saveUsername()}
      >
        {saving ? 'Saving…' : 'Save username'}
      </button>
      {error ? (
        <p className={settingsStyles.feedbackError} role="alert">
          {error}
        </p>
      ) : null}
      {message && !error ? <p className={settingsStyles.feedback}>{message}</p> : null}
    </div>
  )
}

function SettingsCustomDomainBlock({
  user,
  progress,
  baseUrl,
  onProgressUpdated,
}: {
  user: User
  progress: OnboardingProgressPayload
  baseUrl: string
  onProgressUpdated: (p: OnboardingProgressPayload) => void
}) {
  const saved = progress.customDomain ?? ''
  const [domainDraft, setDomainDraft] = useState(saved)
  const [dnsStatus, setDnsStatus] = useState<DnsStatus>('idle')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dnsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dnsPollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    clearDnsVerificationTimers({ dnsTimerRef, dnsPollingRef })
    setDomainDraft(saved)
    setDnsStatus('idle')
    setMessage(null)
    setError(null)
  }, [saved])

  useEffect(() => {
    return () => {
      clearDnsVerificationTimers({ dnsTimerRef, dnsPollingRef })
    }
  }, [])

  const checkDns = useCallback(
    async (domainValue: string) => {
      if (!domainValue) return
      setDnsStatus('checking')
      try {
        const res = await fetch(
          `${baseUrl}/api/onboarding/check-domain?domain=${encodeURIComponent(domainValue)}`,
          { method: 'GET', credentials: 'include' }
        )
        if (!res.ok) throw new Error('Check failed')
        const data = (await res.json()) as { verified?: boolean }
        setDnsStatus(data.verified ? 'verified' : 'not-verified')
      } catch {
        setDnsStatus('error')
      }
    },
    [baseUrl]
  )

  const handleDomainChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9.-]/g, '')
    setDomainDraft(sanitized)
    setDnsStatus('idle')
    setError(null)
    setMessage(null)
    clearDnsVerificationTimers({ dnsTimerRef, dnsPollingRef })
  }

  const startDnsCheck = () => {
    if (!domainDraft) return
    void checkDns(domainDraft)
    clearDnsVerificationTimers({ dnsTimerRef, dnsPollingRef })
    dnsPollingRef.current = setInterval(() => void checkDns(domainDraft), 15000)
  }

  const unchanged = domainDraft === saved
  const canSaveDomain = !unchanged && !saving

  const saveDomain = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    const nextDomain = domainDraft.length > 0 ? domainDraft : null
    const result = await putOnboarding(user, {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      username: progress.username,
      connectedProviderIds: progress.connectedProviderIds,
      customDomain: nextDomain,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not save domain.')
      return
    }
    if (result.payload) {
      onProgressUpdated(result.payload)
    }
    setMessage(nextDomain ? 'Custom domain updated.' : 'Custom domain removed.')
  }

  return (
    <div className={settingsStyles.identityBlock}>
      <h2 className={settingsStyles.h2} id="settings-domain-heading">
        Custom API domain
      </h2>
      <p className={settingsStyles.lede}>
        Hostname for your widget API (same as onboarding). Clear the field and save to disconnect a
        custom domain you no longer use.
      </p>

      <label className={obStyles.label} htmlFor="settings-domain-input">
        Domain name
        <input
          id="settings-domain-input"
          type="text"
          value={domainDraft}
          onChange={(e) => handleDomainChange(e.target.value)}
          className={obStyles.domainInput}
          placeholder="api.yourdomain.com"
        />
      </label>

      {domainDraft ? (
        <div className={obStyles.dnsInstructions}>
          <p className={obStyles.dnsTitle}>
            Add a CNAME record pointing your hostname to the Chronogrove target:
          </p>
          <div className={obStyles.dnsRecords}>
            <div className={obStyles.dnsRecord}>
              <span className={obStyles.dnsType}>CNAME</span>
              <span className={obStyles.dnsHost}>{domainDraft}</span>
              <span className={obStyles.dnsArrow}>→</span>
              <code className={obStyles.dnsValue}>{getOnboardingCnameTarget()}</code>
            </div>
          </div>

          <button
            type="button"
            className={obStyles.btnVerify}
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
            <div className={obStyles.dnsResult}>
              <span className={obStyles.statusOk}>✓</span>
              <div>
                <strong>DNS verified!</strong>
                <p className={obStyles.dnsResultSub}>
                  Your CNAME points to {getOnboardingCnameTarget()}.
                </p>
              </div>
            </div>
          )}

          {dnsStatus === 'not-verified' && (
            <div className={obStyles.dnsResult}>
              <span className={obStyles.statusPending}>⏳</span>
              <div>
                <strong>Not verified yet</strong>
                <p className={obStyles.dnsResultSub}>
                  DNS changes can take time to propagate. We&rsquo;ll keep checking every 15 seconds.
                </p>
              </div>
            </div>
          )}

          {dnsStatus === 'error' && (
            <div className={obStyles.dnsResult}>
              <span className={obStyles.statusBad}>✕</span>
              <div>
                <strong>Verification failed</strong>
                <p className={obStyles.dnsResultSub}>
                  Could not look up DNS records. Check the domain name and try again.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className={`${obStyles.stepActions} ${settingsStyles.domainSaveRow}`}>
        <button
          type="button"
          className={obStyles.btnPrimary}
          disabled={!canSaveDomain}
          onClick={() => void saveDomain()}
        >
          {saving ? 'Saving…' : 'Save domain'}
        </button>
      </div>
      {error ? (
        <p className={settingsStyles.feedbackError} role="alert">
          {error}
        </p>
      ) : null}
      {message && !error ? <p className={settingsStyles.feedback}>{message}</p> : null}
    </div>
  )
}

export function SettingsProfileIdentity({
  user,
  apiSessionReady,
}: {
  user: User
  apiSessionReady: boolean
}) {
  const baseUrl = getAppBaseUrl()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<OnboardingProgressPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user || !apiSessionReady) return
    setLoading(true)
    setLoadError(null)
    try {
      const idToken = await user.getIdToken()
      const res = await apiClient.getJson('/api/onboarding/progress', { idToken })
      if (!res.ok) throw new Error('Could not load profile.')
      const data = (await res.json()) as { payload?: OnboardingProgressPayload }
      if (!data.payload) throw new Error('No profile data.')
      setProgress(data.payload)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Load failed.')
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }, [user, apiSessionReady])

  useEffect(() => {
    if (!user || !apiSessionReady) return
    void load()
  }, [user, apiSessionReady, load])

  if (!apiSessionReady) {
    return (
      <p className={settingsStyles.identityLoading}>
        <span className="spinner" aria-hidden /> Restoring session…
      </p>
    )
  }

  if (loading) {
    return (
      <p className={settingsStyles.identityLoading}>
        <span className="spinner" aria-hidden /> Loading profile…
      </p>
    )
  }

  if (loadError || !progress) {
    return (
      <p className={settingsStyles.feedbackError} role="alert">
        {loadError ?? 'Could not load profile.'}
      </p>
    )
  }

  return (
    <>
      <SettingsUsernameBlock
        user={user}
        progress={progress}
        baseUrl={baseUrl}
        onProgressUpdated={setProgress}
        subsectionClassName={settingsStyles.identitySubsectionFirst as string}
      />
      <SettingsCustomDomainBlock
        user={user}
        progress={progress}
        baseUrl={baseUrl}
        onProgressUpdated={setProgress}
      />
    </>
  )
}
