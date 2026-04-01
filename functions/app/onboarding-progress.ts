import { toStoredDateTime } from '../utils/time.js'

export const ONBOARDING_USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/

const WIZARD_STEPS = ['username', 'connections', 'domain'] as const
export type OnboardingWizardStep = (typeof WIZARD_STEPS)[number]

export const ONBOARDING_FLOW_STEPS = ['username', 'connections', 'domain', 'done'] as const
export type OnboardingFlowStep = (typeof ONBOARDING_FLOW_STEPS)[number]

export const ONBOARDING_OAUTH_PROVIDER_IDS = [
  'github',
  'discogs',
  'spotify',
  'goodreads',
  'steam',
  'flickr',
  'instagram',
] as const

/** API / UI aggregate (unchanged for the hosting client). */
export interface OnboardingProgressPayload {
  currentStep: OnboardingFlowStep
  completedSteps: OnboardingWizardStep[]
  username: string | null
  connectedProviderIds: string[]
  customDomain: string | null
  updatedAt: string
}

/**
 * Firestore: only wizard position + provisional domain hint (until custom domain is an entitlement).
 * Username, provider links, and OAuth live in first-class fields / `integrations`.
 */
export interface UserOnboardingDoc {
  currentStep: OnboardingFlowStep
  completedSteps: OnboardingWizardStep[]
  draftCustomDomain: string | null
  updatedAt: string
}

const DOMAIN_FORMAT = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/

function isWizardStep(s: string): s is OnboardingWizardStep {
  return (WIZARD_STEPS as readonly string[]).includes(s)
}

function isFlowStep(s: string): s is OnboardingFlowStep {
  return (ONBOARDING_FLOW_STEPS as readonly string[]).includes(s)
}

export function defaultOnboardingProgress(): OnboardingProgressPayload {
  return {
    currentStep: 'username',
    completedSteps: [],
    username: null,
    connectedProviderIds: [],
    customDomain: null,
    updatedAt: toStoredDateTime(),
  }
}

function defaultUserOnboardingDoc(): UserOnboardingDoc {
  const t = toStoredDateTime()
  return {
    currentStep: 'username',
    completedSteps: [],
    draftCustomDomain: null,
    updatedAt: t,
  }
}

function normalizeUserOnboarding(raw: unknown): UserOnboardingDoc {
  const base = defaultUserOnboardingDoc()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const cs = o.currentStep
  const currentStep =
    typeof cs === 'string' && isFlowStep(cs) ? cs : base.currentStep
  const comp = o.completedSteps
  const completedSteps: OnboardingWizardStep[] = Array.isArray(comp)
    ? comp.filter((x): x is OnboardingWizardStep => typeof x === 'string' && isWizardStep(x))
    : []
  const draft =
    typeof o.draftCustomDomain === 'string' && o.draftCustomDomain.length > 0
      ? o.draftCustomDomain.toLowerCase().trim()
      : null
  const ua = o.updatedAt
  const updatedAt = typeof ua === 'string' ? ua : base.updatedAt
  return {
    currentStep,
    completedSteps,
    draftCustomDomain: draft,
    updatedAt,
  }
}

/** Legacy blob stored under `onboardingProgress` before schema split. */
function normalizeLegacyOnboardingProgress(raw: unknown): Partial<OnboardingProgressPayload> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  const out: Partial<OnboardingProgressPayload> = {}
  const cs = o.currentStep
  if (typeof cs === 'string' && isFlowStep(cs)) out.currentStep = cs
  const comp = o.completedSteps
  if (Array.isArray(comp)) {
    out.completedSteps = comp.filter(
      (x): x is OnboardingWizardStep => typeof x === 'string' && isWizardStep(x),
    )
  }
  if (typeof o.username === 'string' && o.username.length > 0) {
    out.username = o.username.toLowerCase()
  }
  if (Array.isArray(o.connectedProviderIds)) {
    out.connectedProviderIds = o.connectedProviderIds.filter(
      (x): x is string =>
        typeof x === 'string' &&
        (ONBOARDING_OAUTH_PROVIDER_IDS as readonly string[]).includes(x),
    )
  }
  if (typeof o.customDomain === 'string' && o.customDomain.length > 0) {
    out.customDomain = o.customDomain.toLowerCase().trim()
  }
  if (typeof o.updatedAt === 'string') out.updatedAt = o.updatedAt
  return out
}

export function buildClientPayloadFromFirestore(params: {
  userDoc: Record<string, unknown> | null
  integrationProviderIds: string[]
}): OnboardingProgressPayload {
  const base = defaultOnboardingProgress()
  const doc = params.userDoc

  const userOnboarding = normalizeUserOnboarding(doc?.onboarding)
  const legacy = normalizeLegacyOnboardingProgress(doc?.onboardingProgress)

  const username =
    (typeof doc?.username === 'string' && doc.username.length > 0
      ? doc.username.toLowerCase()
      : null) ??
    legacy.username ??
    null

  const connectedProviderIds =
    params.integrationProviderIds.length > 0
      ? params.integrationProviderIds
      : legacy.connectedProviderIds ?? base.connectedProviderIds

  const currentStep = userOnboarding.currentStep ?? legacy.currentStep ?? base.currentStep
  const completedSteps =
    userOnboarding.completedSteps.length > 0
      ? userOnboarding.completedSteps
      : legacy.completedSteps ?? base.completedSteps

  const customDomain =
    userOnboarding.draftCustomDomain ?? legacy.customDomain ?? base.customDomain

  const updatedAt = userOnboarding.updatedAt ?? legacy.updatedAt ?? base.updatedAt

  return {
    currentStep,
    completedSteps,
    username,
    connectedProviderIds,
    customDomain,
    updatedAt,
  }
}

/** @deprecated Prefer `loadOnboardingStateForApi` / `buildClientPayloadFromFirestore`. Kept for tests and single-blob callers. */
export function normalizeOnboardingProgress(
  legacyBlob: unknown
): OnboardingProgressPayload {
  return buildClientPayloadFromFirestore({
    userDoc:
      legacyBlob === undefined || legacyBlob === null
        ? null
        : { onboardingProgress: legacyBlob },
    integrationProviderIds: [],
  })
}

export function parseOnboardingProgressBody(
  body: unknown
): { ok: true; value: OnboardingProgressPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid body' }
  }
  const o = body as Record<string, unknown>
  const currentStepRaw = o.currentStep
  if (typeof currentStepRaw !== 'string' || !isFlowStep(currentStepRaw)) {
    return { ok: false, error: 'Invalid currentStep' }
  }
  const compRaw = o.completedSteps
  if (!Array.isArray(compRaw)) {
    return { ok: false, error: 'completedSteps must be an array' }
  }
  const completedSteps = compRaw.filter(
    (x): x is OnboardingWizardStep => typeof x === 'string' && isWizardStep(x),
  )
  const un = o.username
  let username: string | null = null
  if (un !== null && un !== undefined) {
    if (typeof un !== 'string') {
      return { ok: false, error: 'Invalid username' }
    }
    if (un.length > 0) {
      const lowered = un.toLowerCase()
      if (!ONBOARDING_USERNAME_PATTERN.test(lowered)) {
        return { ok: false, error: 'Invalid username format' }
      }
      username = lowered
    }
  }
  const cp = o.connectedProviderIds
  if (!Array.isArray(cp)) {
    return { ok: false, error: 'connectedProviderIds must be an array' }
  }
  const connectedProviderIds = cp.filter(
    (x): x is string =>
      typeof x === 'string' &&
      (ONBOARDING_OAUTH_PROVIDER_IDS as readonly string[]).includes(x),
  )
  const cd = o.customDomain
  let customDomain: string | null = null
  if (cd !== null && cd !== undefined) {
    if (typeof cd !== 'string') {
      return { ok: false, error: 'Invalid customDomain' }
    }
    const t = cd.toLowerCase().trim()
    if (t.length > 0) {
      if (t.length > 253 || !DOMAIN_FORMAT.test(t)) {
        return { ok: false, error: 'Invalid domain' }
      }
      customDomain = t
    }
  }
  return {
    ok: true,
    value: {
      currentStep: currentStepRaw,
      completedSteps,
      username,
      connectedProviderIds,
      customDomain,
      updatedAt: toStoredDateTime(),
    },
  }
}