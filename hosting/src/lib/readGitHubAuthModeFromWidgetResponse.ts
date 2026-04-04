export type GitHubWidgetAuthMode = 'oauth' | 'env'

/** Reads `githubAuthMode` from a successful `GET /api/widgets/github` JSON body. */
export function readGitHubAuthModeFromWidgetResponse(data: unknown): GitHubWidgetAuthMode | undefined {
  if (!data || typeof data !== 'object') return undefined
  const mode = (data as { githubAuthMode?: unknown }).githubAuthMode
  return mode === 'oauth' || mode === 'env' ? mode : undefined
}
