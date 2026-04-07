// @ts-check
/** @typedef {import('next').NextConfig} NextConfig */

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
]

/**
 * @param {string} raw
 */
const normalizeSha = (raw) => {
  const sanitized = raw.trim().replace(/^v/i, '')
  return sanitized.length >= 7 ? sanitized.slice(0, 7) : sanitized
}

/** 7-char SHA from CI env, or `git` at build time—reflects the UI bundle, not Functions. */
function getGitShortSha() {
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

/** @type {NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitShortSha(),
    NEXT_PUBLIC_TENANT_DISPLAY_HOST:
      process.env.NEXT_PUBLIC_TENANT_DISPLAY_HOST ?? 'www.chrisvogt.me',
    NEXT_PUBLIC_CLOUD_FUNCTIONS_APP_ORIGIN: cloudFunctionsAppOrigin,
    NEXT_PUBLIC_ONBOARDING_CNAME_TARGET:
      process.env.NEXT_PUBLIC_ONBOARDING_CNAME_TARGET ?? 'personal-stats-chrisvogt.web.app',
  },
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
