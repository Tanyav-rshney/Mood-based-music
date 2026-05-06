/**
 * ============================================
 *  JWT Authentication Middleware
 * ============================================
 * 
 * Protects routes by verifying JWT tokens.
 * Attaches user object to req.user for downstream use.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'neonpulse_super_secret_key_2024';

/**
 * Generate JWT token for a user
 * @param {string} userId - MongoDB user ID
 * @returns {string} JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

/**
 * Middleware: Protect route - requires valid JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for Bearer token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Not authorized. Please login.');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      throw ApiError.unauthorized('User not found. Token may be expired.');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated.');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token. Please login again.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired. Please login again.'));
    }
    next(error);
  }
};

/**
 * Middleware: Optional auth - attaches user if token present, but doesn't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }
  next();
};

/**
 * Middleware: Admin-only access
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    next(ApiError.unauthorized('Admin access required.'));
  }
};

module.exports = {
  generateToken,
  protect,
  optionalAuth,
  adminOnly,
  JWT_SECRET,
};
