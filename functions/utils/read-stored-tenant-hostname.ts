/**
 * Resolves the custom API hostname for a user: `tenantHostname`, then legacy `onboardingProgress.customDomain`.
 */
export function readStoredTenantHostnameFromUserDoc(
  existing: Record<string, unknown>
): string | null {
  const th = existing.tenantHostname
  if (typeof th === 'string' && th.length > 0) {
    return th.toLowerCase().trim()
  }
  const legacy = existing.onboardingProgress
  if (legacy && typeof legacy === 'object') {
    const d = (legacy as Record<string, unknown>).customDomain
    if (typeof d === 'string' && d.length > 0) {
      return d.toLowerCase().trim()
    }
  }
  return null
}
