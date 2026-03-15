import crypto from 'crypto'

import type { Request } from 'express'

interface CookieOptions {
  httpOnly?: boolean
  sameSite?: 'lax' | 'strict'
  secure?: boolean
}

interface CsrfTokenState {
  secret: string
  token: string
  validate: (req: Request, token: string | undefined) => boolean
}

const SECRET_LENGTH = 18
const TOKEN_SALT_LENGTH = 10
const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function createRandomToken(length: number): string {
  let value = ''

  for (let index = 0; index < length; index += 1) {
    const randomIndex = crypto.randomInt(0, TOKEN_CHARS.length)
    value += TOKEN_CHARS[randomIndex]
  }

  return value
}

function tokenize(salt: string, secret: string): string {
  return salt + crypto.createHash('sha1').update(`${salt}${secret}`).digest('base64')
}

export function createCookieBackedCsrfImpl(cookieOptions: CookieOptions) {
  return {
    create(req: Request, secretKey: string): CsrfTokenState {
      const existingSecret = req.cookies?.[secretKey]
      const secret = existingSecret || crypto.randomBytes(SECRET_LENGTH).toString('base64')

      if (!existingSecret) {
        req.res?.cookie(secretKey, secret, cookieOptions)
      }

      const token = tokenize(createRandomToken(TOKEN_SALT_LENGTH), secret)

      return {
        secret,
        token,
        validate(currentReq: Request, submittedToken: string | undefined): boolean {
          if (typeof submittedToken !== 'string') {
            return false
          }

          const requestSecret = currentReq.cookies?.[secretKey]
          if (!requestSecret) {
            return false
          }

          const expectedToken = tokenize(submittedToken.slice(0, TOKEN_SALT_LENGTH), requestSecret)
          return crypto.timingSafeEqual(Buffer.from(submittedToken), Buffer.from(expectedToken))
        },
      }
    },
  }
}
