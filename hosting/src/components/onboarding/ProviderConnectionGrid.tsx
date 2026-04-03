'use client'

import type { CSSProperties } from 'react'
import { ONBOARDING_PROVIDERS } from '@/onboarding/onboardingProviders'
import styles from '@/sections/OnboardingSection.module.css'

export function ProviderConnectionGrid({
  connectedIds,
  onToggle,
}: {
  connectedIds: ReadonlySet<string>
  onToggle: (providerId: string) => void
}) {
  return (
    <div className={styles.providerGrid}>
      {ONBOARDING_PROVIDERS.map((provider) => {
        const connected = connectedIds.has(provider.id)
        return (
          <button
            key={provider.id}
            type="button"
            className={`${styles.providerCard} ${connected ? styles.providerConnected : ''}`}
            onClick={() => onToggle(provider.id)}
            style={{ '--provider-color': provider.color } as CSSProperties}
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
  )
}
