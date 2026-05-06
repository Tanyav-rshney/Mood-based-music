/**
 * ============================================
 *  Logger Configuration - Winston Logger
 * ============================================
 * 
 * Professional logging system using Winston.
 * - Logs to console with colors in development
 * - Logs to files in production (error.log + combined.log)
 * - Includes timestamps and log levels
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

// Custom log format with timestamp and colorization
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}`
      : `[${timestamp}] ${level}: ${message}`;
  })
);

// Create the Winston logger instance
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'neonpulse-api' },
  transports: [
    // Console transport - always active with colors
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        logFormat
      ),
    }),

    // File transport - error logs (only in production)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

module.exports = logger;
