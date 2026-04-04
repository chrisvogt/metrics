import { NextResponse, type NextRequest } from 'next/server'

const SCANNER_PREFIXES = [
  '/wp-admin',
  '/wp-includes',
  '/wp-content',
  '/wp-login',
  '/wp-json',
  '/wordpress',
  '/xmlrpc.php',
  '/.env',
  '/.git',
  '/.aws',
  '/.well-known/security.txt',
  '/phpmyadmin',
  '/pma',
  '/admin/config',
  '/cgi-bin',
  '/vendor/',
  '/telescope/',
  '/debug/',
  '/actuator',
  '/solr/',
  '/console/',
  '/manager/',
  '/backup',
  '/db/',
  '/sql/',
  '/mysql/',
  '/phpinfo',
  '/server-status',
  '/server-info',
  '/_profiler',
  '/elmah.axd',
  '/config.json',
]

const SCANNER_PATTERN = new RegExp(
  `^(${SCANNER_PREFIXES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'i'
)

/** Root / nested PHP probes (e.g. /admin.php); real app has no .php routes. */
const PHP_PROBE = /\.php$/i

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (SCANNER_PATTERN.test(path) || PHP_PROBE.test(path)) {
    return new NextResponse(null, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run on all paths except Next.js internals and static assets.
     * _next/static  — built JS/CSS bundles
     * _next/image   — optimized images
     * favicon.ico/svg — site icon
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg).*)',
  ],
}
