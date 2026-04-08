import { headers } from 'next/headers'

/**
 * Default matches `next.config.mjs` dev rewrites (`beforeFiles` → Functions emulator).
 * Override with `INTERNAL_FUNCTIONS_EMULATOR_APP_ORIGIN` if your project/region differs.
 */
const DEFAULT_DEV_FUNCTIONS_APP_ORIGIN =
  'http://127.0.0.1:5001/personal-stats-chrisvogt/us-central1/app'

function hostLooksLocal(hostnameWithOptionalPort: string): boolean {
  const name = hostnameWithOptionalPort.split(':')[0]?.toLowerCase() ?? ''
  return name === 'localhost' || name.endsWith('.local')
}

/**
 * Base URL for server-side `fetch` to `GET /api/widgets/:provider` (path appended by caller).
 *
 * **Development:** uses **IPv4 loopback** to the Functions emulator so SSR does not call
 * `http(s)://{host}:5173` (avoids `*.local` IPv6-first stalls and TLS-on-HTTP-port mistakes).
 *
 * **Production:** same browser-visible origin from request headers so App Hosting rewrites apply.
 */
export async function getServerWidgetFetchOrigin(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    const custom = process.env.INTERNAL_FUNCTIONS_EMULATOR_APP_ORIGIN?.trim()
    return (custom ?? DEFAULT_DEV_FUNCTIONS_APP_ORIGIN).replace(/\/$/, '')
  }

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const forwardedProto = h.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto =
    forwardedProto ?? (host && hostLooksLocal(host) ? 'http' : 'https')
  if (!host) {
    return 'http://localhost:5173'
  }
  return `${proto}://${host}`
}
