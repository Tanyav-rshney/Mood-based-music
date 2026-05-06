/**
 * ============================================
 *  Song Controller - API Handlers
 * ============================================
 * 
 * CRUD operations for songs in the database.
 * Includes search and filtering capabilities.
 */

const Song = require('../models/Song');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { invalidateCache } = require('../services/recommendationService');
const logger = require('../config/logger');

/**
 * GET /api/songs
 * Fetch all songs with optional filtering and pagination
 * 
 * @query {string} genre - Filter by genre
 * @query {string} artist - Filter by artist
 * @query {string} mood - Filter by mood
 * @query {string} search - Search by title/artist
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 20)
 * @query {string} sort - Sort field (default: createdAt)
 * @query {string} order - Sort order: asc/desc (default: desc)
 */
const getAllSongs = async (req, res, next) => {
  try {
    const {
      genre,
      artist,
      mood,
      search,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    // Build filter object
    const filter = {};
    if (genre) filter.genre = { $regex: genre, $options: 'i' };
    if (artist) filter.artist = { $regex: artist, $options: 'i' };
    if (mood) filter.mood = mood;

    // Search query (title or artist)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };

    // Execute query with pagination
    const [songs, total] = await Promise.all([
      Song.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Song.countDocuments(filter),
    ]);

    logger.info(`📋 Fetched ${songs.length} songs (page ${pageNum}, total ${total})`);

    return res.status(200).json(
      new ApiResponse(200, {
        songs,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalSongs: total,
          limit: limitNum,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      }, `Found ${total} songs`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/songs/:id
 * Fetch a single song by ID
 */
const getSongById = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).lean();

    if (!song) {
      throw ApiError.notFound(`Song not found with ID: ${req.params.id}`);
    }

    return res.status(200).json(
      new ApiResponse(200, { song }, 'Song found')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/songs
 * Add a new song to the database
 * 
 * @body {string} title - Song title (required)
 * @body {string} artist - Artist name (required)
 * @body {string} mood - Mood classification (required)
 * @body {string} genre - Genre
 * @body {Array} genres - Array of genre tags
 * @body {string} image - Album art URL
 * @body {string} audioUrl - Audio file URL
 * @body {Object} audioFeatures - Audio analysis features
 * @body {number} popularity - Popularity score (0-100)
 */
const addSong = async (req, res, next) => {
  try {
    const { title, artist, mood } = req.body;

    // Validate required fields
    if (!title || !artist || !mood) {
      throw ApiError.badRequest('title, artist, and mood are required fields');
    }

    const song = await Song.create(req.body);

    // Invalidate cache since song pool changed
    invalidateCache();

    logger.info(`➕ New song added: "${song.title}" by ${song.artist} [${song.mood}]`);

    return res.status(201).json(
      new ApiResponse(201, { song }, 'Song added successfully')
    );
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return next(ApiError.badRequest('Validation failed', messages));
    }
    next(error);
  }
};

/**
 * POST /api/songs/bulk
 * Add multiple songs at once (for seeding)
 * 
 * @body {Array} songs - Array of song objects
 */
const addBulkSongs = async (req, res, next) => {
  try {
    const { songs } = req.body;

    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      throw ApiError.badRequest('Please provide an array of songs');
    }

    const result = await Song.insertMany(songs, { ordered: false });

    // Invalidate cache
    invalidateCache();

    logger.info(`➕ Bulk added ${result.length} songs`);

    return res.status(201).json(
      new ApiResponse(201, {
        inserted: result.length,
        songs: result,
      }, `${result.length} songs added successfully`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/songs/:id
 * Delete a song by ID
 */
const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);

    if (!song) {
      throw ApiError.notFound(`Song not found with ID: ${req.params.id}`);
    }

    // Invalidate cache
    invalidateCache();

    logger.info(`🗑️ Song deleted: "${song.title}" by ${song.artist}`);

    return res.status(200).json(
      new ApiResponse(200, { song }, 'Song deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSongs,
  getSongById,
  addSong,
  addBulkSongs,
  deleteSong,
};
