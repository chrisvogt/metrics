/**
 * Whether the operator has finished the username step (public slug), either recorded in
 * `completedSteps` or persisted on the user doc as `username` (includes users who set it in Settings).
 */
export function hasCompletedUsernameSelection(payload: {
  username: string | null
  completedSteps: string[]
}): boolean {
  if (payload.completedSteps.includes('username')) return true
  if (payload.username != null && payload.username.trim().length > 0) return true
  return false
}
