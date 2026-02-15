/**
 * Firebase client config loader
 *
 * The app needs apiKey, authDomain, and projectId to talk to Firebase Auth.
 * Instead of hardcoding them here, we fetch them from the backend at runtime.
 *
 * The API key in this config is safe to expose to the client: it is a Firebase
 * Web API key, designed for browser use. Security is enforced by referrer and
 * API restrictions on the key, not by keeping the key secret.
 *
 * Flow:
 * 1. Call loadFirebaseConfig() (e.g. before initializeApp()).
 * 2. It requests GET /api/firebase-config, which returns the values from the
 *    server’s env (CLIENT_API_KEY etc. / auth.client_api_key in production).
 * 3. If the response looks like a placeholder or is missing, we throw and do
 *    not init Firebase — so we never send a fake key to Google.
 *
 * Placeholder check: We treat the same strings as functions/.env.template
 * (CLIENT_API_KEY=your_api_key_here) as invalid so that misconfigured or
 * unset env is caught in the client instead of failing later with auth errors.
 */

let firebaseConfig = null;

const PLACEHOLDER_API_KEYS = ['your_api_key_here', 'YOUR_API_KEY_HERE'];

function isPlaceholderConfig(config) {
  return !config?.apiKey || PLACEHOLDER_API_KEYS.includes(config.apiKey);
}

// Fetch configuration from backend
async function loadFirebaseConfig() {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error(`Failed to load Firebase config (${response.status})`);
    }
    firebaseConfig = await response.json();
    if (isPlaceholderConfig(firebaseConfig)) {
      throw new Error(
        'Firebase config not configured: API key missing or still set to placeholder. ' +
        'Check that the backend serves /api/firebase-config and that auth.client_api_key is set in production.'
      );
    }
    return firebaseConfig;
  } catch (error) {
    console.error('Error loading Firebase config:', error);
    throw error;
  }
}

// Export the config and the loader function
export { firebaseConfig, loadFirebaseConfig };
