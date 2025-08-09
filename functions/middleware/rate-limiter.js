import { logger } from 'firebase-functions'

// Simple in-memory rate limiter
// For production, consider using Redis or a more robust solution
const rateLimitStore = new Map()

const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
    } else {
      const record = rateLimitStore.get(key)
      
      if (now > record.resetTime) {
        // Reset window
        record.count = 1
        record.resetTime = now + windowMs
      } else {
        record.count++
      }
      
      if (record.count > maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${key}`)
        return res.status(429).json({
          ok: false,
          error: 'Too many requests. Please try again later.'
        })
      }
    }
    
    next()
  }
}

export default rateLimiter
