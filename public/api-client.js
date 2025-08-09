// API Client for making authenticated requests to Firebase Functions
class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  // Get the stored JWT token
  getAuthToken() {
    return localStorage.getItem('authToken');
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
    return this.makeRequest('/api/auth/logout', {
      method: 'POST',
    });
  }
}

// Export for use in other files
export { ApiClient };
