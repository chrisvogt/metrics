import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth'

export interface FirebaseConfig {
  apiKey: string
  authDomain?: string
  projectId?: string
}

const PLACEHOLDER_KEYS = ['your_api_key_here', 'YOUR_API_KEY_HERE']

export async function getFirebaseApp(): Promise<{ app: FirebaseApp; auth: Auth }> {
  const res = await fetch('/api/firebase-config')
  if (!res.ok) throw new Error(`Failed to load Firebase config (${res.status})`)
  const config = (await res.json()) as FirebaseConfig | null
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
