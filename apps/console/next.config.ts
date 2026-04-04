import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

/** 7-char SHA from CI env, or `git` at build time—reflects the UI bundle, not Functions. */
function getGitShortSha(): string {
  for (const key of BUILD_SHA_ENV_KEYS) {
    const value = process.env[key]
    if (value) {
      return normalizeSha(value)
    }
  }

  try {
    return normalizeSha(
      execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: __dirname }).trim()
    )
  } catch {
    return 'unknown'
  }
}

const cloudFunctionsAppOrigin =
  process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN ??
  'https://us-central1-personal-stats-chrisvogt.cloudfunctions.net/app'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitShortSha(),
    /** Public site hostname for this tenant (overview title, etc.). Override per deployment. */
    NEXT_PUBLIC_TENANT_DISPLAY_HOST:
      process.env.NEXT_PUBLIC_TENANT_DISPLAY_HOST ?? 'www.chrisvogt.me',
    /**
     * Base URL for the deployed `app` HTTPS function (no trailing slash).
     * SSE/manual sync streams must call this origin so responses are not buffered by intermediaries.
     * Non-SSE `/api/*` traffic uses same-origin URLs and is proxied via rewrites below.
     */
    NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN: cloudFunctionsAppOrigin,
  },
  /**
   * Proxy `/api/*` to Cloud Function `app`: local dev hits the emulator; production SSR hits the deployed function.
   * The browser keeps same-origin `/api/...` URLs (cookies, relative `getAppBaseUrl()`), while Next forwards server-side.
   *
   * Use `beforeFiles` (not the default `afterFiles` array form) so `/api` is rewritten before the App Router
   * tries to handle the path — otherwise dev can 404 even when the Functions emulator is healthy.
   */
  async rewrites() {
    const apiRewrite =
      process.env.NODE_ENV === 'development'
        ? {
            source: '/api/:path*',
            destination:
              'http://127.0.0.1:5001/personal-stats-chrisvogt/us-central1/app/api/:path*',
          }
        : {
            source: '/api/:path*',
            destination: `${cloudFunctionsAppOrigin}/api/:path*`,
          }

    return {
      beforeFiles: [apiRewrite],
    }
  },
}

export default nextConfig
