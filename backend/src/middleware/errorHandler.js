/**
 * ============================================
 *  Error Handler Middleware
 * ============================================
 * 
 * Global error handling middleware.
 * Catches all errors thrown in controllers/services
 * and returns clean, consistent error responses.
 */

const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

/**
 * Global error handler - must have 4 parameters for Express to recognize it
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if no status code
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map((e) => e.message);
  }

  // Log the error
  if (statusCode >= 500) {
    logger.error(`❌ [${statusCode}] ${message}`, { stack: err.stack });
  } else {
    logger.warn(`⚠️ [${statusCode}] ${message}`);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    // Include stack trace only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler - for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
