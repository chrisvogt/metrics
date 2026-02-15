export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  getAuthToken() {
    const sessionCookie = this.getSessionCookie()
    if (sessionCookie) return sessionCookie
    return typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null
  }

  getSessionCookie() {
    if (typeof document === 'undefined') return null
    for (const cookie of document.cookie.split(';')) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'session') return value
    }
    return null
  }

  async createSession(token) {
    const res = await fetch(`${this.baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Session failed: ${res.status} - ${text}`)
    }
    return res.json()
  }

  clearSession() {
    if (typeof document !== 'undefined') {
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      localStorage.removeItem('authToken')
    }
  }

  async logout() {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.getAuthToken()}` },
        credentials: 'include',
      })
    } finally {
      this.clearSession()
    }
  }
}

export const apiClient = new ApiClient()
