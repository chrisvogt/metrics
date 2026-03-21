import { getBackendPathConfig } from './backend-config.js'
import type { SyncProviderId, WidgetDataSource } from '../types/widget-content.js'

const USERS_COLLECTION = 'users'
const SHADOW_PROVIDER_SUFFIX = '_tmp'

export const getDefaultWidgetUserId = () => getBackendPathConfig().defaultWidgetUserId

export const getUsersCollectionPath = () => USERS_COLLECTION

export const toProviderPathSegment = (
  provider: string,
  source: WidgetDataSource = 'live'
) => (source === 'shadow' ? `${provider}${SHADOW_PROVIDER_SUFFIX}` : provider)

export const toUserCollectionPath = (
  userId: string,
  provider: string,
  source: WidgetDataSource = 'live'
) => `${USERS_COLLECTION}/${userId}/${toProviderPathSegment(provider, source)}`

export const toProviderCollectionPath = (
  provider: string,
  userId: string = getDefaultWidgetUserId(),
  source: WidgetDataSource = 'live'
) => toUserCollectionPath(userId, provider, source)

export const toMediaPrefix = (
  userId: string,
  provider: string,
  suffix = '',
  source: WidgetDataSource = 'live'
) => `${userId}/${toProviderPathSegment(provider, source)}/${suffix}`

export const toProviderMediaPrefix = (
  provider: string,
  userId: string = getDefaultWidgetUserId(),
  suffix = '',
  source: WidgetDataSource = 'live'
) => toMediaPrefix(userId, provider, suffix, source)

export const getWidgetDataSourceForProvider = (
  provider: SyncProviderId
): WidgetDataSource => getBackendPathConfig().widgetDataSourceByProvider[provider] ?? 'live'

export const getWidgetUserIdForHostname = (hostname: string | undefined) => {
  const { defaultWidgetUserId, widgetUserIdByHostname } = getBackendPathConfig()
  if (!hostname) {
    return defaultWidgetUserId
  }

  return widgetUserIdByHostname[hostname] ?? defaultWidgetUserId
}
