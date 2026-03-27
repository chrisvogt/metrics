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
  },
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
