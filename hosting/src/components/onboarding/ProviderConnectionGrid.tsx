'use client'

import type { CSSProperties } from 'react'
import { ONBOARDING_PROVIDERS } from '@/onboarding/onboardingProviders'
import styles from '@/sections/OnboardingSection.module.css'

function labelForProvider(
  providerId: string,
  connected: boolean,
  status: string | undefined
): string {
  if (!connected) return 'Connect'
  if ((providerId === 'flickr' || providerId === 'steam') && status === 'pending_oauth')
    return 'Link account'
  if (status === 'pending_oauth') return 'Pending'
  if (status === 'connected') return 'Connected'
  return 'Connected'
}

export function ProviderConnectionGrid({
  connectedIds,
  integrationStatuses = {},
  onToggle,
  onOAuthProviderConnect,
}: {
  connectedIds: ReadonlySet<string>
  integrationStatuses?: Readonly<Record<string, string>>
  onToggle: (providerId: string) => void
  /** For OAuth-native providers (e.g. Flickr), invoked instead of a plain toggle when linking. */
  onOAuthProviderConnect?: (providerId: string) => void | Promise<void>
}) {
  return (
    <div className={styles.providerGrid}>
      {ONBOARDING_PROVIDERS.map((provider) => {
        const connected = connectedIds.has(provider.id)
        const status = integrationStatuses[provider.id]
        const oauthReady = status === 'connected'
        const isOauthLink = provider.id === 'flickr' || provider.id === 'steam'
        const label = labelForProvider(provider.id, connected, status)
        const showConnectedStyle =
          connected && (!isOauthLink || oauthReady) && status !== 'pending_oauth'

        return (
          <button
            key={provider.id}
            type="button"
            className={`${styles.providerCard} ${showConnectedStyle ? styles.providerConnected : ''}`}
            onClick={() => {
              if (isOauthLink) {
                if (oauthReady) {
                  onToggle(provider.id)
                  return
                }
                void onOAuthProviderConnect?.(provider.id)
                return
              }
              onToggle(provider.id)
            }}
            style={{ '--provider-color': provider.color } as CSSProperties}
          >
            <span className={styles.providerIcon}>{provider.icon}</span>
            <span className={styles.providerLabel}>{provider.label}</span>
            <span className={styles.providerStatus}>
              {showConnectedStyle ? (
                <>
                  <span className={styles.connectedDot} />
                  {label}
                </>
              ) : (
                label
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
