/**
 * ============================================
 *  Cache Configuration - In-Memory Caching
 * ============================================
 * 
 * Uses node-cache for fast in-memory caching.
 * Reduces database queries for repeated mood-based lookups.
 * 
 * Cache Strategy:
 * - Song recommendations by mood are cached for CACHE_TTL seconds
 * - Cache is invalidated when new songs are added
 * - Keeps the API fast without external dependencies like Redis
 */

const NodeCache = require('node-cache');

// Default TTL: 5 minutes (300 seconds), check expired keys every 60s
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 300,
  checkperiod: 60,
  useClones: false,  // Better performance - return reference instead of clone
});

module.exports = cache;
