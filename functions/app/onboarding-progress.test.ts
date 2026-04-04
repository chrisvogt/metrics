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
      integrationStatuses: {},
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
        tenantHostname: 'x.example.com',
        onboarding: {
          currentStep: 'domain',
          completedSteps: ['username', 'connections'],
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

  it('prefers tenantHostname over legacy onboardingProgress.customDomain', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        tenantHostname: 'api.authoritative.com',
        onboarding: { currentStep: 'domain', completedSteps: ['domain'], updatedAt: 't' },
        onboardingProgress: { customDomain: 'legacy-only.example.com' },
      },
      integrationProviderIds: [],
    })
    expect(payload.customDomain).toBe('api.authoritative.com')
  })

  it('merges legacy blob for username and steps when onboarding completed is empty', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        onboarding: {
          currentStep: 'connections',
          completedSteps: [],
          updatedAt: 'new-t',
        },
        onboardingProgress: {
          currentStep: 'domain',
          completedSteps: ['username'],
          username: 'legacy_u',
          connectedProviderIds: ['steam'],
          customDomain: 'LEGACY.EXAMPLE.ORG',
          updatedAt: '2020-01-01',
        },
      },
      integrationProviderIds: [],
    })
    expect(payload.currentStep).toBe('connections')
    expect(payload.completedSteps).toEqual(['username'])
    expect(payload.username).toBe('legacy_u')
    expect(payload.connectedProviderIds).toEqual(['steam'])
    expect(payload.customDomain).toBe('legacy.example.org')
    expect(payload.updatedAt).toBe('new-t')
  })

  it('prefers integration ids over legacy when subcollection is non-empty', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        onboardingProgress: {
          currentStep: 'connections',
          connectedProviderIds: ['github'],
        },
      },
      integrationProviderIds: ['spotify'],
    })
    expect(payload.connectedProviderIds).toEqual(['spotify'])
  })

  it('normalizes tenantHostname and coerces invalid flow steps', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        tenantHostname: '  Example.COM ',
        onboarding: {
          currentStep: 'not_a_real_step',
          completedSteps: ['bogus', 'username'],
        },
      },
      integrationProviderIds: [],
    })
    expect(payload.currentStep).toBe('username')
    expect(payload.completedSteps).toEqual(['username'])
    expect(payload.customDomain).toBe('example.com')
  })

  it('normalizes legacy blob via normalizeOnboardingProgress', () => {
    const p = normalizeOnboardingProgress({
      currentStep: 'done',
      completedSteps: ['username', 'connections', 'domain'],
      username: 'Z',
      connectedProviderIds: [],
      customDomain: null,
    })
    /* No `onboarding` doc yet — legacy blob supplies currentStep when present */
    expect(p.currentStep).toBe('done')
    expect(p.completedSteps).toEqual(['username', 'connections', 'domain'])
    expect(p.username).toBe('z')
  })

  it('parseOnboardingProgressBody rejects invalid bodies and fields', () => {
    expect(parseOnboardingProgressBody(null).ok).toBe(false)
    expect(parseOnboardingProgressBody('x').ok).toBe(false)
    expect(parseOnboardingProgressBody({ currentStep: 'nope' }).ok).toBe(false)
    expect(
      parseOnboardingProgressBody({
        currentStep: 'username',
        completedSteps: 'no',
        username: null,
        connectedProviderIds: [],
        customDomain: null,
      }).ok
    ).toBe(false)
    expect(
      parseOnboardingProgressBody({
        currentStep: 'username',
        completedSteps: [],
        username: 1 as unknown as string,
        connectedProviderIds: [],
        customDomain: null,
      }).ok
    ).toBe(false)
    expect(
      parseOnboardingProgressBody({
        currentStep: 'username',
        completedSteps: [],
        username: null,
        connectedProviderIds: [],
        customDomain: 99 as unknown as string,
      }).ok
    ).toBe(false)
    expect(
      parseOnboardingProgressBody({
        currentStep: 'username',
        completedSteps: [],
        username: '',
        connectedProviderIds: [],
        customDomain: 'a'.repeat(254),
      }).ok
    ).toBe(false)
    expect(
      parseOnboardingProgressBody({
        currentStep: 'username',
        completedSteps: [],
        username: '',
        connectedProviderIds: [],
        customDomain: '-bad.com',
      }).ok
    ).toBe(false)
    expect(
      parseOnboardingProgressBody({
        currentStep: 'username',
        completedSteps: [],
        username: '',
        connectedProviderIds: 'x' as unknown as string[],
        customDomain: null,
      }).ok
    ).toBe(false)
  })

  it('parseOnboardingProgressBody accepts empty optional strings', () => {
    const parsed = parseOnboardingProgressBody({
      currentStep: 'username',
      completedSteps: [],
      username: '',
      connectedProviderIds: [],
      customDomain: null,
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.username).toBeNull()
    expect(parsed.value.customDomain).toBeNull()
  })

  it('parseOnboardingProgressBody treats whitespace-only customDomain as null', () => {
    const parsed = parseOnboardingProgressBody({
      currentStep: 'username',
      completedSteps: [],
      username: null,
      connectedProviderIds: [],
      customDomain: '   ',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.customDomain).toBeNull()
  })

  it('treats non-array onboarding.completedSteps as empty', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        onboarding: {
          currentStep: 'username',
          completedSteps: 'broken' as unknown as [],
        },
      },
      integrationProviderIds: [],
    })
    expect(payload.completedSteps).toEqual([])
  })

  it('buildClientPayloadFromFirestore uses legacy username when doc.username empty string', () => {
    const payload = buildClientPayloadFromFirestore({
      userDoc: {
        username: '',
        onboardingProgress: { username: 'from_legacy' },
      },
      integrationProviderIds: [],
    })
    expect(payload.username).toBe('from_legacy')
  })

})
