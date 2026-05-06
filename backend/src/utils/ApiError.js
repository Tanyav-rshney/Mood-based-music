/**
 * ============================================
 *  Custom API Error Class
 * ============================================
 * 
 * Extends the native Error with HTTP status codes
 * for clean error handling throughout the application.
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
   * @param {string} message - Error message
   * @param {Array} errors - Optional array of detailed errors
   * @param {string} stack - Optional stack trace
   */
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Factory methods for common errors
  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
}

module.exports = ApiError;
