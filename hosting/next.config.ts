import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 7-char SHA from CI env, or `git` at build time—reflects the UI bundle, not Functions. */
function getGitShortSha(): string {
  const raw =
    process.env.NEXT_PUBLIC_GIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.COMMIT_SHA
  if (raw) {
    const s = raw.replace(/^v/, '').trim()
    return s.length >= 7 ? s.slice(0, 7) : s
  }
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: __dirname }).trim()
  } catch {
    return 'unknown'
  }
}

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitShortSha(),
    /** Public site hostname for this tenant (overview title, etc.). Override per deployment. */
    NEXT_PUBLIC_TENANT_DISPLAY_HOST:
      process.env.NEXT_PUBLIC_TENANT_DISPLAY_HOST ?? 'www.chrisvogt.me',
    /**
     * Base URL for the deployed `app` HTTPS function (no trailing slash).
     * SSE/manual sync streams must call this origin so responses are not buffered by Firebase Hosting rewrites.
     */
    NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN:
      process.env.NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN ??
      'https://us-central1-personal-stats-chrisvogt.cloudfunctions.net/app',
  },
  /**
   * This rewrite exists only to make `next dev` feel like production.
   *
   * In local Next.js development, requests to `/api/*` would otherwise hit the
   * Next dev server and 404 because the API actually lives in Firebase
   * Functions. So we proxy those requests directly to the local Functions
   * emulator.
   *
   * This is intentionally dev-only:
   * - `output: 'export'` means Next does not ship its own runtime rewrites in
   *   the static export.
   * - Firebase Hosting handles `/api/**` in emulator/prod via `firebase.json`,
   *   where those requests are rewritten to the `app` Cloud Function.
   *
   * So the split is:
   * - local `next dev` -> this rewrite
   * - Firebase Hosting emulator / deployed production -> `firebase.json` rewrite
   */
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return []
    }
    return [
      {
        source: '/api/:path*',
        destination:
          'http://127.0.0.1:5001/personal-stats-chrisvogt/us-central1/app/api/:path*',
      },
    ]
  },
}

export default nextConfig
