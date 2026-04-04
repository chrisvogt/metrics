/**
 * Planned Firestore layout for multi-tenant onboarding and OAuth.
 *
 * These constants are not wired into widget routing or sync yet — they document
 * where new data will live so we can migrate without moving existing documents.
 *
 * Rollout (do not skip steps):
 * 1. Keep serving widgets via `getWidgetUserIdForHostname` (env map + default).
 * 2. Add Admin-only writers for `tenant_usernames` / `tenant_hosts` / `integrations`.
 * 3. Set `ENABLE_FIRESTORE_TENANT_ROUTING=true` only after Firestore lookups are
 *    implemented and tested; until then the flag has no runtime effect.
 * 4. Firestore rules deny all client access; integrations stay server-only — expose only
 *    non-secret fields via HTTPS APIs when OAuth goes live.
 *
 * Naming: top-level `tenant_*` avoids colliding with `users/{uid}/{provider}`.
 */

/** Slug → uid claim documents (transaction with user profile update). */
export const TENANT_USERNAMES_COLLECTION = 'tenant_usernames'

/** Verified hostname → uid (custom domains). */
export const TENANT_HOSTS_COLLECTION = 'tenant_hosts'

/** Segment under `users/{uid}` for per-provider OAuth material (Admin SDK only). */
export const USER_INTEGRATIONS_SEGMENT = 'integrations'

/**
 * Short-lived Flickr OAuth 1.0a request-token bridge (doc id = oauth_token from Flickr).
 * Admin SDK only; cleared after access token exchange.
 */
export const OAUTH_FLICKR_PENDING_COLLECTION = 'oauth_flickr_pending'

/**
 * Short-lived Steam OAuth state bridge (doc id = `state` sent to steamcommunity.com).
 * Admin SDK only; cleared after token exchange.
 */
export const OAUTH_STEAM_PENDING_COLLECTION = 'oauth_steam_pending'

export const toTenantUsernameDocPath = (slug: string): string =>
  `${TENANT_USERNAMES_COLLECTION}/${slug}`

export const toTenantHostDocPath = (normalizedHostname: string): string =>
  `${TENANT_HOSTS_COLLECTION}/${normalizedHostname}`

export const toUserIntegrationDocPath = (uid: string, providerId: string): string =>
  `users/${uid}/${USER_INTEGRATIONS_SEGMENT}/${providerId}`
