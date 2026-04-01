import { describe, expect, it } from 'vitest'

import {
  buildClientPayloadFromFirestore,
  defaultOnboardingProgress,
  normalizeOnboardingProgress,
  parseOnboardingProgressBody,
} from './onboarding-progress.js'

describe('onboarding progress', () => {
  it('normalizes missing document to defaults', () => {
    expect(normalizeOnboardingProgress(undefined)).toMatchObject({
      currentStep: 'username',
      completedSteps: [],
      username: null,
      connectedProviderIds: [],
      customDomain: null,
    })
  })

  it('parses a valid full body', () => {
    const parsed = parseOnboardingProgressBody({
      currentStep: 'connections',
      completedSteps: ['username'],
      username: 'valid_user',
      connectedProviderIds: ['spotify', 'github'],
      customDomain: 'api.example.com',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.currentStep).toBe('connections')
    expect(parsed.value.completedSteps).toEqual(['username'])
    expect(parsed.value.username).toBe('valid_user')
    expect(parsed.value.connectedProviderIds).toEqual(['spotify', 'github'])
    expect(parsed.value.customDomain).toBe('api.example.com')
    expect(parsed.value.updatedAt).toMatch(/\d{4}/)
  })

  it('rejects invalid username in body', () => {
    const parsed = parseOnboardingProgressBody({
      ...defaultOnboardingProgress(),
      currentStep: 'username',
      username: 'no!bad',
    })
    expect(parsed.ok).toBe(false)
  })

  it('filters unknown provider ids', () => {
    const parsed = parseOnboardingProgressBody({
      currentStep: 'connections',
      completedSteps: [],
      username: null,
      connectedProviderIds: ['spotify', 'facebook'],
      customDomain: null,
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.connectedProviderIds).toEqual(['spotify'])
  })

  it('merges first-class user fields with integration subcollection ids', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        username: 'alpha',
        onboarding: {
          currentStep: 'domain',
          completedSteps: ['username', 'connections'],
          draftCustomDomain: 'x.example.com',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      integrationProviderIds: ['github', 'spotify'],
    })
    expect(payload.username).toBe('alpha')
    expect(payload.connectedProviderIds).toEqual(['github', 'spotify'])
    expect(payload.customDomain).toBe('x.example.com')
    expect(payload.currentStep).toBe('domain')
  })
})
