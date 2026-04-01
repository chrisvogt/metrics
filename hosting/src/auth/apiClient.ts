export class ApiClient {
  private baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  getAuthToken(): string | null {
    const sessionCookie = this.getSessionCookie()
    if (sessionCookie) return sessionCookie
    return typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null
  }

  getSessionCookie(): string | null {
    return this.getCookieValue('session')
  }

  getCookieValue(name: string): string | null {
    if (typeof document === 'undefined') return null
    for (const cookie of document.cookie.split(';')) {
      const trimmedCookie = cookie.trim()
      const separatorIndex = trimmedCookie.indexOf('=')
      if (separatorIndex === -1) continue

      const cookieName = trimmedCookie.slice(0, separatorIndex)
      const value = trimmedCookie.slice(separatorIndex + 1)

      if (cookieName === name) {
        try {
          return decodeURIComponent(value)
        } catch {
          return value
        }
      }
    }
    return null
  }

  async getCsrfToken(): Promise<string | null> {
    const existingToken = this.getCookieValue('XSRF-TOKEN')
    if (existingToken) return existingToken

    const res = await fetch(`${this.baseUrl}/api/csrf-token`, {
      credentials: 'include',
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new Error(`CSRF token request failed: ${res.status}`)
    }

    const payload = await res.json().catch(() => ({} as { csrfToken?: string }))
    return this.getCookieValue('XSRF-TOKEN') ?? payload.csrfToken ?? null
  }

  async createSession(token: string): Promise<{ ok: boolean; message?: string }> {
    const csrfToken = await this.getCsrfToken()
    const res = await fetch(`${this.baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      },
      credentials: 'include',
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Session failed: ${res.status} - ${text}`)
    }
    return res.json() as Promise<{ ok: boolean; message?: string }>
  }

  clearSession(): void {
    if (typeof document !== 'undefined') {
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      localStorage.removeItem('authToken')
    }
  }

  getAuthorizationHeader(): Record<string, string> {
    const token = this.getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async getJson(path: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      credentials: 'include',
      headers: {
        ...this.getAuthorizationHeader(),
      },
    })
  }

  async putJson(path: string, body: unknown): Promise<Response> {
    const csrfToken = await this.getCsrfToken()
    return fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthorizationHeader(),
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })
  }

  async logout(): Promise<void> {
    try {
      const csrfToken = await this.getCsrfToken()
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
        credentials: 'include',
      })
    } finally {
      this.clearSession()
    }
  }
}

export const apiClient = new ApiClient()
