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
 * Resolves which Firestore user id owns widget data for this HTTP `Host`.
 *
 * Today this is **only** `WIDGET_USER_ID_BY_HOSTNAME` + `DEFAULT_WIDGET_USER_ID`.
 * Firestore-backed custom domains (`tenant_hosts`) stay **off** until implemented
 * and `ENABLE_FIRESTORE_TENANT_ROUTING=true` in config. Onboarding UX can add data
 * on the side without changing this behavior.
 */
export const getWidgetUserIdForHostname = (hostname: string | undefined) => {
  const { defaultWidgetUserId, widgetUserIdByHostname } = getBackendPathConfig()
  if (!hostname) {
    return defaultWidgetUserId
  }

  return widgetUserIdByHostname[hostname] ?? defaultWidgetUserId
}
