import { createContext, useContext, useState, useEffect, useMemo } from 'react'
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

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState(null)
  const [error, setError] = useState(null)

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
            } catch (e) {
              try {
                const token = await u.getIdToken()
                localStorage.setItem('authToken', token)
              } catch {}
            }
          } else {
            apiClient.clearSession()
          }
        })
        return () => unsub()
      })
      .catch((e) => {
        if (!cancelled) setError(e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
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
      setError(e.message || 'Google sign-in failed')
      throw e
    }
  }

  const signInWithEmail = async (email, password) => {
    if (!auth) return
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e) {
      const msg =
        e.code === 'auth/user-not-found'
          ? 'No account with this email.'
          : e.code === 'auth/wrong-password'
            ? 'Incorrect password.'
            : e.code === 'auth/invalid-email'
              ? 'Invalid email address.'
              : e.message || 'Sign-in failed'
      setError(msg)
      throw e
    }
  }

  const signInWithPhone = async (phoneNumber) => {
    if (!auth) return
    setError(null)
    const verifier = new RecaptchaVerifier(auth, 'phone-recaptcha', { size: 'invisible' })
    try {
      return await signInWithPhoneNumber(auth, phoneNumber, verifier)
    } catch (e) {
      setError(e.message || 'Phone sign-in failed')
      throw e
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await apiClient.logout()
    } catch {}
    if (auth) await signOut(auth)
  }

  const value = useMemo(
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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
