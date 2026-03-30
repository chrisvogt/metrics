const BUILD_SHA_ENV_KEYS = [
  'NEXT_PUBLIC_GIT_SHA',
  'VERCEL_GIT_COMMIT_SHA',
  'CF_PAGES_COMMIT_SHA',
  'GITHUB_SHA',
  'COMMIT_SHA',
] as const

const normalizeSha = (raw: string): string => {
  const sanitized = raw.trim().replace(/^v/i, '')
  return sanitized.length >= 7 ? sanitized.slice(0, 7) : sanitized
}

/** Resolve the short SHA baked into the static UI bundle. */
export function resolveGitShortSha(
  env: Record<string, string | undefined>,
  getGitSha: () => string
): string {
  for (const key of BUILD_SHA_ENV_KEYS) {
    const value = env[key]
    if (value) {
      return normalizeSha(value)
    }
  }

  try {
    return normalizeSha(getGitSha())
  } catch {
    return 'unknown'
  }
}
