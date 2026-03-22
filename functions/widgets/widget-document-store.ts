import { toUserCollectionPath } from '../config/backend-paths.js'
import type { SyncProviderId } from '../types/widget-content.js'
export { toDateOrDefault } from '../utils/time.js'

export const toWidgetContentPath = (collectionPath: string) => `${collectionPath}/widget-content`
export const toUserWidgetContentPath = (
  userId: string,
  provider: SyncProviderId
) => toWidgetContentPath(toUserCollectionPath(userId, provider))
