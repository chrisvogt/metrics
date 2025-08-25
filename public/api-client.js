// API Client for making authenticated requests to Firebase Functions
class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  // Get the stored JWT token (fallback to localStorage)
  getAuthToken() {
    // First try to get from session cookie
    const sessionCookie = this.getSessionCookie();
    if (sessionCookie) {
      console.log('Using session cookie for authentication');
      return sessionCookie;
    }
    
    // Fallback to localStorage
    const localToken = localStorage.getItem('authToken');
    if (localToken) {
      console.log('Using localStorage token for authentication (fallback)');
    } else {
      console.log('No authentication token found');
    }
    return localToken;
  }

  // Get session cookie if it exists
  getSessionCookie() {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'session') {
        return value;
      }
    }
    return null;
  }

  // Create a session cookie from JWT token
  async createSession(token) {
    try {
      console.log('Creating session cookie...');
      const response = await fetch(`${this.baseUrl}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' // Important: include cookies
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Session creation failed:', response.status, errorText);
        throw new Error(`Failed to create session: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Session cookie created successfully:', result);
      
      // Verify the cookie was set
      const cookies = this.listAllCookies();
      console.log('Current cookies after session creation:', cookies);
      
      return result;
    } catch (error) {
      console.error('Error creating session cookie:', error);
      throw error;
    }
  }

  // Clear session cookie
  clearSession() {
    // Clear the session cookie by setting it to expire in the past
    document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    localStorage.removeItem('authToken');
  }

  // List all cookies (for debugging)
  listAllCookies() {
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = value;
      }
    });
    return cookies;
  }

  // Make an authenticated API request
  async makeRequest(endpoint, options = {}) {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Include cookies in requests
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get user profile
  async getUserProfile() {
    return this.makeRequest('/api/user/profile');
  }

  // Sync data for a specific provider
  async syncProviderData(provider) {
    return this.makeRequest(`/api/widgets/sync/${provider}`);
  }

  // Get widget data (public endpoint, no auth required)
  async getWidgetData(provider) {
    const url = `${this.baseUrl}/api/widgets/${provider}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Widget data request failed:', error);
      throw error;
    }
  }

  // Logout (server-side)
  async logout() {
    try {
      const result = await this.makeRequest('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear local session data
      this.clearSession();
      
      return result;
    } catch (error) {
      // Even if server logout fails, clear local session
      this.clearSession();
      throw error;
    }
  }
}

// Export for use in other files
export { ApiClient };
