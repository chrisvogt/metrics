import { describe, expect, it, vi } from 'vitest'
import type { Request } from 'express'
import {
  firstQueryString,
  resolveWidgetDataUserIdFromPublicQuery,
} from './resolve-widget-data-user-id.js'

describe('resolveWidgetDataUserIdFromPublicQuery', () => {
  const store = (opts: {
    claim?: { uid?: string } | null
    legacyUid?: string | null
  }) => ({
    getDocument: vi.fn().mockResolvedValue(opts.claim === undefined ? null : opts.claim),
    legacyUsernameOwnerUid:
      opts.legacyUid === undefined
        ? undefined
        : vi.fn().mockResolvedValue(opts.legacyUid),
  })

  const req = (query: Record<string, unknown>): Request =>
    ({ query }) as unknown as Request

  it('returns skip when no query params', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(req({}), store({}))
    expect(result).toBe('skip')
  })

  it('returns userId for valid uid', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(
      req({ uid: 'firebaseUid_01' }),
      store({})
    )
    expect(result).toEqual({ userId: 'firebaseUid_01' })
  })

  it('returns not_found for invalid uid characters', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(
      req({ uid: 'has/slash' }),
      store({})
    )
    expect(result).toBe('not_found')
  })

  it('resolves username from tenant_usernames claim', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(
      req({ username: 'cool-user' }),
      store({ claim: { uid: 'owner-1' } })
    )
    expect(result).toEqual({ userId: 'owner-1' })
  })

  it('uses legacyUsernameOwnerUid when claim missing', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(
      req({ username: 'cool-user' }),
      store({ claim: null, legacyUid: 'owner-2' })
    )
    expect(result).toEqual({ userId: 'owner-2' })
  })

  it('returns not_found when username unknown', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(
      req({ username: 'cool-user' }),
      store({ claim: null, legacyUid: null })
    )
    expect(result).toBe('not_found')
  })

  it('prefers uid over username', async () => {
    const result = await resolveWidgetDataUserIdFromPublicQuery(
      req({ uid: 'win-uid', username: 'cool-user' }),
      store({ claim: { uid: 'lose-uid' } })
    )
    expect(result).toEqual({ userId: 'win-uid' })
  })
})

describe('firstQueryString', () => {
  it('reads first array element', () => {
    expect(firstQueryString(['a', 'b'])).toBe('a')
  })
})
