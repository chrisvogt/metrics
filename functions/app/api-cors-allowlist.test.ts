import { describe, expect, it } from 'vitest'

import { getApiCorsOriginRegexList } from './api-cors-allowlist.js'

function originAllowed(origin: string, isProduction: boolean): boolean {
  return getApiCorsOriginRegexList(isProduction).some((r) => r.test(origin))
}

describe('getApiCorsOriginRegexList', () => {
  it('allows chronogrove operator and public API hosts', () => {
    expect(originAllowed('https://console.chronogrove.com', true)).toBe(true)
    expect(originAllowed('https://api.chronogrove.com', true)).toBe(true)
  })

  it('allows non-metrics chrisvogt.me hosts', () => {
    expect(originAllowed('https://chrisvogt.me', true)).toBe(true)
    expect(originAllowed('https://www.chrisvogt.me', true)).toBe(true)
    expect(originAllowed('https://api.chrisvogt.me', true)).toBe(true)
  })

  it('denies sunset metrics operator host on chrisvogt.me', () => {
    const legacyOperator = `https://${['metrics', 'chrisvogt', 'me'].join('.')}`
    expect(originAllowed(legacyOperator, true)).toBe(false)
    expect(originAllowed(legacyOperator.replace(/^https/, 'http'), true)).toBe(false)
  })

  it('allows dev-chrisvogt hosts (emulator / staging)', () => {
    expect(originAllowed('https://metrics.dev-chrisvogt.me:8084', true)).toBe(true)
  })

  it('allows localhost when not production', () => {
    expect(originAllowed('http://localhost:3000', false)).toBe(true)
    expect(originAllowed('http://localhost:3000', true)).toBe(false)
  })

  it('rejects unrelated origins', () => {
    expect(originAllowed('https://evil.example.com', true)).toBe(false)
  })
})
