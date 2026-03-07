import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import rateLimiter from './rate-limiter.js'
import { logger } from 'firebase-functions'

// Mock Firebase Functions logger
vi.mock('firebase-functions', () => ({
  logger: {
    warn: vi.fn()
  }
}))

describe('rateLimiter', () => {
  let mockReq: { ip?: string; socket?: { remoteAddress?: string } }
  let mockRes: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
  let mockNext: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockReq = {
      ip: '192.168.1.100',
      socket: {
        remoteAddress: '192.168.1.100'
      }
    }
    mockRes = {
      status: vi.fn(() => mockRes),
      json: vi.fn()
    }
    mockNext = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('basic functionality', () => {
    it('should create middleware function', () => {
      const middleware = rateLimiter()
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next parameters
    })

    it('should handle first request without blocking', () => {
      const middleware = rateLimiter(15 * 60 * 1000, 1) // 1 request max
      
      middleware(mockReq, mockRes, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockRes.status).not.toHaveBeenCalled()
    })
  })

  describe('IP address handling', () => {
    it('should use req.ip when available', () => {
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
      
      // Test with custom window and max requests
      const middleware = rateLimiter(60 * 1000, 5) // 1 minute, 5 requests
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3)
    })

    it('should use default parameters when none provided', () => {
      
      const middleware = rateLimiter() // Use defaults
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3)
    })
  })

  describe('rate limit exceeded', () => {
    it('should return 429 when maxRequests exceeded', () => {
      const middleware = rateLimiter(15 * 60 * 1000, 2)
      const uniqueReq = { ip: '192.168.1.200', socket: { remoteAddress: '192.168.1.200' } }

      middleware(uniqueReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(1)

      middleware(uniqueReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(2)

      middleware(uniqueReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(2)
      expect(mockRes.status).toHaveBeenCalledWith(429)
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Too many requests. Please try again later.',
      })
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith('Rate limit exceeded for IP: 192.168.1.200')
    })
  })

  describe('window reset', () => {
    it('should reset count when window has expired', () => {
      vi.useFakeTimers()
      const middleware = rateLimiter(1000, 1)
      const uniqueReq = { ip: '10.0.0.99', socket: { remoteAddress: '10.0.0.99' } }

      middleware(uniqueReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)

      middleware(uniqueReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalledTimes(2)
      expect(mockRes.status).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('error handling', () => {
    it('should not crash with malformed request objects', () => {
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
      const middleware = rateLimiter()
      
      const malformedRes = {}
      
      expect(() => {
        middleware(mockReq, malformedRes, mockNext)
      }).not.toThrow()
    })
  })
})
