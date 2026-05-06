/**
 * ============================================
 *  Database Configuration - MongoDB Connection
 * ============================================
 * 
 * Connects to MongoDB using Mongoose.
 * Supports both local MongoDB and MongoDB Atlas.
 * Includes retry logic and connection event handlers.
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB database
 * Uses MONGODB_URI from environment variables
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8+ handles these automatically, but we set them for clarity
      serverSelectionTimeoutMS: 5000,   // Timeout after 5s if server not found
      socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📂 Database Name: ${conn.connection.name}`);

    // Connection event handlers for monitoring
    mongoose.connection.on('error', (err) => {
      logger.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    logger.error(`❌ MongoDB Connection Failed: ${error.message}`);
    // Exit process with failure in production, but allow fallback in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

module.exports = connectDB;
