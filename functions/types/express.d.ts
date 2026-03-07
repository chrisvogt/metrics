export interface AuthUser {
  uid: string
  email?: string
  emailVerified?: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
