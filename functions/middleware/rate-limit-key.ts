import type { Request } from 'express'

function normalizeForwardedFor(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  return value.split(',')[0]?.trim() || null
}

export function getRateLimitKey(req: Request): string {
  const forwardedFor = normalizeForwardedFor(req.headers['x-forwarded-for'])

  return (
    req.ip ||
    forwardedFor ||
    req.socket?.remoteAddress ||
    `${req.method}:${req.path}:local-dev`
  )
}
