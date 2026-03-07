import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import type { User, Auth, ConfirmationResult } from 'firebase/auth'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { getFirebaseApp } from './firebase'
import { apiClient } from './apiClient'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  setError: (err: string | null) => void
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signInWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>
  logout: () => Promise<void>
  auth: Auth | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState<Auth | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getFirebaseApp()
      .then(({ auth: a }) => {
        if (cancelled) return
        setAuth(a)
        const unsub = onAuthStateChanged(a, async (u) => {
          setUser(u)
          if (u) {
            try {
              const token = await u.getIdToken()
              await apiClient.createSession(token)
            } catch {
              try {
                const token = await u.getIdToken()
                localStorage.setItem('authToken', token)
              } catch {
                // ignore
              }
            }
          } else {
            apiClient.clearSession()
          }
        })
        return () => unsub()
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const googleProvider = useMemo(() => {
    const p = new GoogleAuthProvider()
    p.setCustomParameters({ hd: 'chrisvogt.me' })
    return p
  }, [])

  const signInWithGoogle = async () => {
    if (!auth) return
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      const err = e as { message?: string }
      setError(err.message ?? 'Google sign-in failed')
      throw e
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) return
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      const err = e as { code?: string; message?: string }
      const msg =
        err.code === 'auth/user-not-found'
          ? 'No account with this email.'
          : err.code === 'auth/wrong-password'
            ? 'Incorrect password.'
            : err.code === 'auth/invalid-email'
              ? 'Invalid email address.'
              : err.message ?? 'Sign-in failed'
      setError(msg)
      throw e
    }
  }

  const signInWithPhone = async (phoneNumber: string) => {
    if (!auth) throw new Error('Auth not ready')
    setError(null)
    const verifier = new RecaptchaVerifier(auth, 'phone-recaptcha', { size: 'invisible' })
    try {
      return await signInWithPhoneNumber(auth, phoneNumber, verifier)
    } catch (e) {
      const err = e as { message?: string }
      setError(err.message ?? 'Phone sign-in failed')
      throw e
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await apiClient.logout()
    } catch {
      // ignore
    }
    if (auth) await signOut(auth)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      setError,
      signInWithGoogle,
      signInWithEmail,
      signInWithPhone,
      logout,
      auth,
    }),
    [user, loading, error, auth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
