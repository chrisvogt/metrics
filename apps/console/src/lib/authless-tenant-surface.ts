import { isAuthlessPublicStatusSurface } from '@/lib/tenant-api-root-map'

/**
 * Whether the current route is treated as a public (no Firebase Auth shell) surface,
 * including optional Firestore-backed tenant API roots on `/`.
 */
export function isPublicStatusSurfaceWithOptionalFirestoreTenant(
  pathname: string,
  browserHostname: string | undefined,
  firestoreTenantSlug: string | null,
  enableFirestorePublicRoot: boolean
): boolean {
  if (isAuthlessPublicStatusSurface(pathname, browserHostname)) {
    return true
  }
  if (
    !enableFirestorePublicRoot ||
    pathname !== '/' ||
    !browserHostname ||
    !firestoreTenantSlug
  ) {
    return false
  }
  return true
}
