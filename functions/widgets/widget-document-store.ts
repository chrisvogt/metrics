import { getWidgetDataSourceForProvider, toUserCollectionPath } from '../config/backend-paths.js'
import type { SyncProviderId, WidgetDataSource } from '../types/widget-content.js'
export { toDateOrDefault } from '../utils/time.js'

export const toWidgetContentPath = (collectionPath: string) => `${collectionPath}/widget-content`
export const toUserWidgetContentPath = (
  userId: string,
  provider: SyncProviderId,
  source: WidgetDataSource = getWidgetDataSourceForProvider(provider)
) => toWidgetContentPath(toUserCollectionPath(userId, provider, source))
