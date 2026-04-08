import { describe, expect, it } from 'vitest'
import type { HeaderBag } from './request-host-headers'
import { hostLabelFromHostLine, primaryHostLineFromHeaders } from './request-host-headers'

function bag(entries: Record<string, string>): HeaderBag {
  return {
    get(name: string) {
      return entries[name] ?? null
    },
  }
}

describe('primaryHostLineFromHeaders', () => {
  it('prefers first x-forwarded-host segment', () => {
    expect(
      primaryHostLineFromHeaders(
        bag({ 'x-forwarded-host': 'api.example.com, internal.proxy', host: '127.0.0.1:8080' }),
      ),
    ).toBe('api.example.com')
  })

  it('falls back to host', () => {
    expect(primaryHostLineFromHeaders(bag({ host: 'metrics.example.com:443' }))).toBe(
      'metrics.example.com:443'
    )
  })

  it('returns undefined when missing', () => {
    expect(primaryHostLineFromHeaders(bag({}))).toBeUndefined()
  })
})

describe('hostLabelFromHostLine', () => {
  it('strips port and lowercases', () => {
    expect(hostLabelFromHostLine('API.EXAMPLE.COM:8443')).toBe('api.example.com')
  })

  it('uses first comma segment', () => {
    expect(hostLabelFromHostLine('first.host, second')).toBe('first.host')
  })

  it('returns undefined for blank', () => {
    expect(hostLabelFromHostLine(undefined)).toBeUndefined()
    expect(hostLabelFromHostLine('')).toBeUndefined()
  })
})
