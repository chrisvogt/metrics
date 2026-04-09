import { getBackendPathConfig } from './backend-config.js'

const USERS_COLLECTION = 'users'

export const getDefaultWidgetUserId = () => getBackendPathConfig().defaultWidgetUserId

export const getUsersCollectionPath = () => USERS_COLLECTION

export const toProviderPathSegment = (provider: string) => provider

export const toUserCollectionPath = (
  userId: string,
  provider: string
) => `${USERS_COLLECTION}/${userId}/${toProviderPathSegment(provider)}`

export const toProviderCollectionPath = (
  provider: string,
  userId: string = getDefaultWidgetUserId()
) => toUserCollectionPath(userId, provider)

export const toMediaPrefix = (
  userId: string,
  provider: string,
  suffix = ''
) => `${userId}/${toProviderPathSegment(provider)}/${suffix}`

export const toProviderMediaPrefix = (
  provider: string,
  userId: string = getDefaultWidgetUserId(),
  suffix = ''
) => toMediaPrefix(userId, provider, suffix)

/**
 * Sync slice: env map (`WIDGET_USER_ID_BY_HOSTNAME`) + default only.
 * When `ENABLE_FIRESTORE_TENANT_ROUTING=true`, use `resolveWidgetUserIdForHostname`
 * from `../services/tenant-host-routing.js` for full resolution (cached Firestore).
 */
export const getWidgetUserIdForHostname = (hostname: string | undefined) => {
  const { defaultWidgetUserId, widgetUserIdByHostname } = getBackendPathConfig()
  if (!hostname) {
    return defaultWidgetUserId
  }

  return widgetUserIdByHostname[hostname.toLowerCase()] ?? defaultWidgetUserId
}
