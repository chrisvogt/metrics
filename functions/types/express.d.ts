export interface AuthUser {
  uid: string
  email?: string
  emailVerified?: boolean
}

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string | undefined>
      csrfToken?: () => string
      user?: AuthUser
    }
  }
}

export {}
