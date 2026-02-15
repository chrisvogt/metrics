import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'

const PLACEHOLDER_KEYS = ['your_api_key_here', 'YOUR_API_KEY_HERE']

export async function getFirebaseApp() {
  const res = await fetch('/api/firebase-config')
  if (!res.ok) throw new Error(`Failed to load Firebase config (${res.status})`)
  const config = await res.json()
  if (!config?.apiKey || PLACEHOLDER_KEYS.includes(config.apiKey)) {
    throw new Error(
      'Firebase config not configured. Check that auth.client_api_key is set in production.'
    )
  }
  const app = initializeApp(config)
  const auth = getAuth(app)

  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  if (hostname === 'metrics.dev-chrisvogt.me' || hostname === 'localhost' || hostname === '127.0.0.1') {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099')
    } catch {
      // already connected or emulator not running
    }
  }

  return { app, auth }
}
