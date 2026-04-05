/**
 * Runtime origins for cross-app links.
 * In dev (Vite dev server), points to local ports.
 * In production, points to the canonical subdomains.
 */

const IS_DEV = import.meta.env.DEV

export const CONSOLE_ORIGIN = IS_DEV
  ? 'http://console.dev-chronogrove.com:5173'
  : 'https://console.chronogrove.com'

export const API_ORIGIN = IS_DEV
  ? 'http://api.dev-chronogrove.com:5001'
  : 'https://api.chronogrove.com'

export const GITHUB_REPO = 'https://github.com/chrisvogt/chronogrove'
