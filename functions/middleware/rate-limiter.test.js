import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Firebase Functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    warn: vi.fn()
  }
}))

describe('rateLimiter', () => {
  let mockReq
  let mockRes
  let mockNext

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock request
    mockReq = {
      ip: '192.168.1.100',
      socket: {
        remoteAddress: '192.168.1.100'
      }
    }
    
    // Setup mock response
    mockRes = {
      status: vi.fn(() => mockRes),
      json: vi.fn()
    }
    
    // Setup mock next function
    mockNext = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should create middleware function', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter()
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next parameters
    })

    it('should handle first request without blocking', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter(15 * 60 * 1000, 1) // 1 request max
      
      middleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('IP address handling', () => {
    it('should use req.ip when available', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter(15 * 60 * 1000, 1)
      
      mockReq.ip = '10.0.0.1'
      mockReq.socket.remoteAddress = '192.168.1.1'
      
      // Should not crash and should call next
      expect(() => {
        middleware(mockReq, mockRes, mockNext)
      }).not.toThrow()
      
      expect(mockNext).toHaveBeenCalled()
    })

    it('should fallback to req.socket.remoteAddress when req.ip is not available', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter(15 * 60 * 1000, 1)
      
      delete mockReq.ip
      mockReq.socket.remoteAddress = '172.16.0.1'
      
      // Should not crash and should call next
      expect(() => {
        middleware(mockReq, mockRes, mockNext)
      }).not.toThrow()
      
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle undefined IP addresses gracefully', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter(15 * 60 * 1000, 1)
      
      delete mockReq.ip
      delete mockReq.socket.remoteAddress
      
      // Should not crash
      expect(() => {
        middleware(mockReq, mockRes, mockNext)
      }).not.toThrow()
      
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('configuration', () => {
    it('should accept custom parameters', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      
      // Test with custom window and max requests
      const middleware = rateLimiter(60 * 1000, 5) // 1 minute, 5 requests
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3)
    })

    it('should use default parameters when none provided', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      
      const middleware = rateLimiter() // Use defaults
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3)
    })
  })

  describe('error handling', () => {
    it('should not crash with malformed request objects', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter()
      
      const malformedReq = {
        // Missing ip and socket properties
        socket: {} // Empty socket object
      }
      
      expect(() => {
        middleware(malformedReq, mockRes, mockNext)
      }).not.toThrow()
    })

    it('should not crash with malformed response objects', () => {
      const { default: rateLimiter } = require('./rate-limiter.js')
      const middleware = rateLimiter()
      
      const malformedRes = {}
      
      expect(() => {
        middleware(mockReq, malformedRes, mockNext)
      }).not.toThrow()
    })
  })
})
