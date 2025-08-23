// Firebase configuration
// Configuration is loaded dynamically from the backend
// This prevents hardcoding sensitive values in the client

let firebaseConfig = null;

// Fetch configuration from backend
async function loadFirebaseConfig() {
  try {
    const response = await fetch('/api/firebase-config');
    if (!response.ok) {
      throw new Error('Failed to load Firebase config');
    }
    firebaseConfig = await response.json();
    return firebaseConfig;
  } catch (error) {
    console.error('Error loading Firebase config:', error);
    // Fallback to placeholder config
    firebaseConfig = {
      apiKey: "YOUR_API_KEY_HERE",
      authDomain: "YOUR_AUTH_DOMAIN_HERE",
      projectId: "YOUR_PROJECT_ID_HERE"
    };
    return firebaseConfig;
  }
}

// Export the config and the loader function
export { firebaseConfig, loadFirebaseConfig };
