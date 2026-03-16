import type firebaseAdmin from 'firebase-admin'

import type {
  AuthClaims,
  AuthService,
  CreateSessionCookieOptions,
  UserProfile,
} from '../../ports/auth-service.js'

const toAuthClaims = (claims: {
  uid: string
  email?: string
  email_verified?: boolean
}): AuthClaims => ({
  uid: claims.uid,
  email: claims.email,
  emailVerified: claims.email_verified,
})

export class FirebaseAuthService implements AuthService {
  constructor(private readonly admin: typeof firebaseAdmin) {}

  async verifySessionCookie(sessionCookie: string): Promise<AuthClaims> {
    const decodedClaims = await this.admin.auth().verifySessionCookie(sessionCookie, true)
    return toAuthClaims(decodedClaims)
  }

  async verifyIdToken(token: string): Promise<AuthClaims> {
    const decodedToken = await this.admin.auth().verifyIdToken(token)
    return toAuthClaims(decodedToken)
  }

  async getUser(uid: string): Promise<UserProfile> {
    const userRecord = await this.admin.auth().getUser(uid)

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
    }
  }

  async deleteUser(uid: string): Promise<void> {
    await this.admin.auth().deleteUser(uid)
  }

  async createSessionCookie(
    token: string,
    options: CreateSessionCookieOptions
  ): Promise<string> {
    return this.admin.auth().createSessionCookie(token, options)
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    await this.admin.auth().revokeRefreshTokens(uid)
  }
}
