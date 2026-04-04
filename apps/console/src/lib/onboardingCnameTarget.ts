/**
 * Canonical CNAME target shown in onboarding / settings DNS instructions.
 * Keep defaults aligned with Cloud Functions `ONBOARDING_REQUIRED_CNAME_TARGET`
 * (Phase 1: App Hosting `*.web.app`; Phase 2: e.g. `api.chronogrove.com` via env).
 */
export function getOnboardingCnameTarget(): string {
  return process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET ?? 'personal-stats-chrisvogt.web.app'
}
