export interface AuthClaims {
  uid: string
  email?: string
  emailVerified?: boolean
}

export interface UserProfile {
  uid: string
  email?: string
  displayName?: string | null
  photoURL?: string | null
  emailVerified: boolean
  creationTime?: string
  lastSignInTime?: string
}

export interface CreateSessionCookieOptions {
  expiresIn: number
}

export interface AuthService {
  verifySessionCookie(sessionCookie: string): Promise<AuthClaims>
  verifyIdToken(token: string): Promise<AuthClaims>
  getUser(uid: string): Promise<UserProfile>
  deleteUser(uid: string): Promise<void>
  createSessionCookie(token: string, options: CreateSessionCookieOptions): Promise<string>
  revokeRefreshTokens(uid: string): Promise<void>
}
