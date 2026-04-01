/**
 * Planned Firestore layout for multi-tenant onboarding and OAuth.
 *
 * These constants are not wired into widget routing or sync yet — they document
 * where new data will live so we can migrate without moving existing documents.
 *
 * Rollout (do not skip steps):
 * 1. Keep serving widgets via `getWidgetUserIdForHostname` (env map + default).
 * 2. Add Admin-only writers for `tenant_usernames` / `tenant_hosts` / `integrations`
 *    while rules still match today.
 * 3. Set `ENABLE_FIRESTORE_TENANT_ROUTING=true` only after Firestore lookups are
 *    implemented and tested; until then the flag has no runtime effect.
 * 4. Tighten Firestore rules so secrets under `users/{uid}/integrations/**` are
 *    never client-readable before storing OAuth refresh tokens.
 *
 * Naming: top-level `tenant_*` avoids colliding with `users/{uid}/{provider}`.
 */

/** Slug → uid claim documents (transaction with user profile update). */
export const TENANT_USERNAMES_COLLECTION = 'tenant_usernames'

/** Verified hostname → uid (custom domains). */
export const TENANT_HOSTS_COLLECTION = 'tenant_hosts'

/** Segment under `users/{uid}` for per-provider OAuth material (Admin SDK only). */
export const USER_INTEGRATIONS_SEGMENT = 'integrations'

export const toTenantUsernameDocPath = (slug: string): string =>
  `${TENANT_USERNAMES_COLLECTION}/${slug}`

export const toTenantHostDocPath = (normalizedHostname: string): string =>
  `${TENANT_HOSTS_COLLECTION}/${normalizedHostname}`

export const toUserIntegrationDocPath = (uid: string, providerId: string): string =>
  `users/${uid}/${USER_INTEGRATIONS_SEGMENT}/${providerId}`
