import type { User } from 'firebase/auth'

const ALLOWED_SUFFIXES = ['@chrisvogt.me', '@chronogrove.com'] as const

/** Aligns with server `isAllowedEmail` for production domains (console UX only). */
export function isConsoleAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ALLOWED_SUFFIXES.some((s) => email.endsWith(s))
}

/** Allowed-domain accounts must verify email before full console API access. */
export function mustVerifyEmailBeforeConsole(user: User | null): boolean {
  if (!user?.email) return false
  return isConsoleAllowedEmail(user.email) && user.emailVerified === false
}
