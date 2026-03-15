const DEFAULT_WIDGET_USER_ID = 'chrisvogt'
const USERS_COLLECTION = 'users'

export const getDefaultWidgetUserId = () => DEFAULT_WIDGET_USER_ID

export const getUsersCollectionPath = () => USERS_COLLECTION

export const toUserCollectionPath = (userId: string, provider: string) =>
  `${USERS_COLLECTION}/${userId}/${provider}`

export const toMediaPrefix = (userId: string, provider: string, suffix = '') =>
  `${userId}/${provider}/${suffix}`

export const getWidgetUserIdForHostname = (hostname: string | undefined) =>
  hostname === 'api.chronogrove.com' ? 'chronogrove' : DEFAULT_WIDGET_USER_ID
