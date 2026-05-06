/**
 * ============================================
 *  Standardized API Response Class
 * ============================================
 * 
 * Ensures all API responses follow a consistent format.
 * Makes frontend consumption predictable and reliable.
 */

class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*} data - Response payload
   * @param {string} message - Human-readable message
   */
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  // Factory methods for common responses
  static ok(data, message = 'Success') {
    return new ApiResponse(200, data, message);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  static noContent(message = 'Deleted successfully') {
    return new ApiResponse(204, null, message);
  }
}

module.exports = ApiResponse;
