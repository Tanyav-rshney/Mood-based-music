/**
 * ============================================
 *  Rate Limiter Middleware
 * ============================================
 * 
 * Protects API from abuse with request rate limiting.
 * Uses express-rate-limit for sliding window rate limiting.
 * 
 * Default: 100 requests per 15 minutes per IP
 */

const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * General API rate limiter
 * Applies to all /api/ routes
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,  // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,   // Disable `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Stricter limiter for write operations
 * Applies to POST/PUT/DELETE endpoints
 */
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,  // Only 30 write operations per 15 minutes
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many write operations. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  writeLimiter,
};
