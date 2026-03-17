import { toUserCollectionPath } from '../config/backend-paths.js'
export { toDateOrDefault } from '../utils/time.js'

export const toWidgetContentPath = (collectionPath: string) => `${collectionPath}/widget-content`
export const toUserWidgetContentPath = (userId: string, provider: string) =>
  toWidgetContentPath(toUserCollectionPath(userId, provider))
