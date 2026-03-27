import { describe, expect, it } from 'vitest'
import type { Request } from 'express'

import { createCookieBackedCsrfImpl } from './cookie-backed-csrf.js'

function buildReq(): {
  req: Request
  cookies: Record<string, string>
  } {
  const cookies: Record<string, string> = {}
  const req = {
    cookies,
    res: {
      cookie: (name: string, value: string) => {
        cookies[name] = value
      },
    },
  } as unknown as Request
  return { req, cookies }
}

describe('createCookieBackedCsrfImpl', () => {
  const impl = createCookieBackedCsrfImpl({ httpOnly: true, sameSite: 'lax', secure: false })

  it('validate returns false when the submitted token is not a string', () => {
    const { req } = buildReq()
    const state = impl.create(req, '_csrfSecret')
    expect(
      state.validate({ cookies: { _csrfSecret: state.secret } } as Request, undefined),
    ).toBe(false)
  })

  it('validate returns false when the secret cookie is missing', () => {
    const { req } = buildReq()
    const state = impl.create(req, '_csrfSecret')
    expect(state.validate({ cookies: {} } as Request, state.token)).toBe(false)
  })

  it('validate returns false when the token length does not match the expected value', () => {
    const { req } = buildReq()
    const state = impl.create(req, '_csrfSecret')
    expect(
      state.validate({ cookies: { _csrfSecret: state.secret } } as Request, 'short'),
    ).toBe(false)
  })

  it('validate returns true for a token produced by create with the same secret', () => {
    const { req } = buildReq()
    const state = impl.create(req, '_csrfSecret')
    expect(
      state.validate({ cookies: { _csrfSecret: state.secret } } as Request, state.token),
    ).toBe(true)
  })
})
