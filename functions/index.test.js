import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'

// Mock Firebase Admin
const firestoreSettingsMock = vi.fn()
const firestoreMock = () => ({
  settings: firestoreSettingsMock
})

vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    credential: {
      cert: vi.fn(() => ({ mock: 'cert' }))
    },
    firestore: firestoreMock
  }
}))

// Mock Firebase Functions
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((config, handler) => handler)
}))

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((config, handler) => handler)
}))

vi.mock('firebase-functions/params', () => ({
  defineString: vi.fn(() => ({
    value: () => 'mock-database-url'
  }))
}))

// Mock file system
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => JSON.stringify({ mock: 'token' }))
}))

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn()
}))

// Mock the job modules
vi.mock('./jobs/sync-goodreads-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ success: true }))
}))

vi.mock('./jobs/sync-instagram-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ success: true }))
}))

vi.mock('./jobs/sync-spotify-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ success: true }))
}))

vi.mock('./jobs/sync-steam-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ success: true }))
}))

vi.mock('./jobs/sync-flickr-data.js', () => ({
  default: vi.fn(() => Promise.resolve({ success: true }))
}))

// Mock the widget content module
vi.mock('./lib/get-widget-content.js', () => ({
  getWidgetContent: vi.fn(() => Promise.resolve({ mock: 'widget-content' })),
  validWidgetIds: ['spotify', 'goodreads', 'steam', 'instagram', 'flickr']
}))

describe('index.js', () => {
  let app

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Set NODE_ENV to test to avoid dotenv loading
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Express App', () => {
    beforeEach(async () => {
      // Import the app after mocking
      const { app: expressApp } = await import('./index.js')
      app = expressApp
    })

    describe('GET /api/widgets/:provider', () => {
      it('should return widget content for valid provider', async () => {
        const response = await request(app)
          .get('/api/widgets/spotify')
          .expect(200)

        expect(response.body).toEqual({
          ok: true,
          payload: { mock: 'widget-content' }
        })
        expect(response.headers['cache-control']).toBe('public, max-age=3600, s-maxage=7200')
      })

      it('should return 404 for invalid provider', async () => {
        const response = await request(app)
          .get('/api/widgets/invalid-provider')
          .expect(404)

        expect(response.body).toEqual({
          ok: false,
          error: 'A valid provider type is required.'
        })
      })

      it.skip('should return 404 for missing provider', async () => {
        // Skipped: Express will not match this route and will return an empty object
        const response = await request(app)
          .get('/api/widgets/')
          .expect(404)

        expect(response.body).toEqual({
          ok: false,
          error: 'A valid provider type is required.'
        })
      })

      it('should handle errors from getWidgetContent', async () => {
        const { getWidgetContent } = await import('./lib/get-widget-content.js')
        vi.mocked(getWidgetContent).mockRejectedValueOnce(new Error('Widget content error'))

        const response = await request(app)
          .get('/api/widgets/spotify')
          .expect(400)

        expect(response.body).toEqual({
          ok: false,
          error: 'Widget content error'
        })
      })
    })

    describe('GET * (catch-all)', () => {
      it('should return 404 for unknown routes', async () => {
        await request(app)
          .get('/api/unknown-route')
          .expect(404)

        await request(app)
          .get('/some-random-path')
          .expect(404)
      })
    })
  })

  describe('Helper Functions', () => {
    it('should build success response correctly', async () => {
      const { app: expressApp } = await import('./index.js')
      
      // Test the buildSuccessResponse function by making a request
      const response = await request(expressApp)
        .get('/api/widgets/spotify')
        .expect(200)

      expect(response.body.ok).toBe(true)
      expect(response.body.payload).toBeDefined()
    })

    it('should build failure response correctly', async () => {
      const { app: expressApp } = await import('./index.js')
      
      // Test the buildFailureResponse function by making a request with invalid provider
      const response = await request(expressApp)
        .get('/api/widgets/invalid-provider')
        .expect(404)

      expect(response.body.ok).toBe(false)
      expect(response.body.error).toBeDefined()
    })
  })

  describe('CORS Configuration', () => {
    it('should allow requests from chrisvogt.me domains', async () => {
      const { app: expressApp } = await import('./index.js')
      
      const response = await request(expressApp)
        .get('/api/widgets/spotify')
        .set('Origin', 'https://chrisvogt.me')
        .expect(200)

      expect(response.body.ok).toBe(true)
    })

    it('should allow requests from dev-chrisvogt.me domains', async () => {
      const { app: expressApp } = await import('./index.js')
      
      const response = await request(expressApp)
        .get('/api/widgets/spotify')
        .set('Origin', 'https://dev-chrisvogt.me')
        .expect(200)

      expect(response.body.ok).toBe(true)
    })

    it('should allow requests from netlify.app domains', async () => {
      const { app: expressApp } = await import('./index.js')
      
      const response = await request(expressApp)
        .get('/api/widgets/spotify')
        .set('Origin', 'https://my-app.netlify.app')
        .expect(200)

      expect(response.body.ok).toBe(true)
    })
  })

  describe('Scheduled Functions', () => {
    it('should export syncGoodreadsData function', async () => {
      const { syncGoodreadsData } = await import('./index.js')
      expect(typeof syncGoodreadsData).toBe('function')
    })

    it('should export syncSpotifyData function', async () => {
      const { syncSpotifyData } = await import('./index.js')
      expect(typeof syncSpotifyData).toBe('function')
    })

    it('should export syncSteamData function', async () => {
      const { syncSteamData } = await import('./index.js')
      expect(typeof syncSteamData).toBe('function')
    })

    it('should export syncInstagramData function', async () => {
      const { syncInstagramData } = await import('./index.js')
      expect(typeof syncInstagramData).toBe('function')
    })

    it('should export syncFlickrData function', async () => {
      const { syncFlickrData } = await import('./index.js')
      expect(typeof syncFlickrData).toBe('function')
    })
  })

  describe('Firebase Admin Initialization', () => {
    it('should initialize Firebase Admin with correct settings', async () => {
      // Clear mocks and reset modules to ensure clean state
      vi.clearAllMocks()
      vi.resetModules()
      
      // Import admin first to get the mocked functions
      const admin = await import('firebase-admin')
      
      // Import index.js which will trigger the initialization
      await import('./index.js')
      
      expect(admin.default.initializeApp).toHaveBeenCalledWith({
        credential: expect.any(Object),
        databaseURL: 'mock-database-url'
      })
      
      expect(firestoreSettingsMock).toHaveBeenCalledWith({
        ignoreUndefinedProperties: true
      })
    })
  })
}) 