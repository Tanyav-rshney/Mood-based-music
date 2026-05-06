/**
 * ============================================
 *  Recommendation Controller - API Handlers
 * ============================================
 * 
 * Handles recommendation endpoints.
 * Integrates mood processing + song fetching into a single flow.
 * 
 * COMPATIBLE WITH EXISTING FRONTEND:
 * - POST /api/recommendations (existing frontend calls this)
 * - GET /api/recommend/:mood (new clean REST endpoint)
 */

const { classifyMood } = require('../services/moodService');
const { getRecommendations } = require('../services/recommendationService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * POST /api/recommendations
 * *** MAIN ENDPOINT - Called by existing React frontend ***
 * 
 * Receives mood/preferences, classifies mood if needed, returns songs.
 * Maintains backward compatibility with the existing frontend API contract.
 * 
 * @body {string} mood - Mood (from UI mood buttons)
 * @body {number} intensity - Mood intensity 0-100
 * @body {string} query - Optional text query
 * @body {Array} artists - Optional artist preferences
 * @body {Array} genres - Optional genre preferences
 * @body {Object} profile - Optional user profile
 */
const getRecommendationsHandler = async (req, res, next) => {
  try {
    const {
      mood = 'chilled',
      intensity = 50,
      query = '',
      artists = [],
      genres = [],
      profile = {},
      page = 1,
      limit = 20,
    } = req.body || {};

    logger.info(`🎧 Recommendation request: mood=${mood}, intensity=${intensity}, query="${query}"`);

    // Get recommendations from the service
    const result = await getRecommendations(mood, {
      limit: parseInt(limit),
      page: parseInt(page),
      intensity: parseInt(intensity),
      query,
    });

    // Return in the format the frontend expects:
    // { recommendations: [...], explanation: "...", source: "..." }
    return res.status(200).json({
      recommendations: result.recommendations,
      explanation: result.explanation,
      source: result.source,
      total: result.total,
      page: result.page,
      pages: result.pages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/recommend/:mood
 * NEW REST endpoint for mood-based recommendations
 * 
 * @param {string} mood - Mood to get recommendations for
 * @query {number} page - Page number
 * @query {number} limit - Results per page
 * @query {number} intensity - Mood intensity (0-100)
 */
const getRecommendationsByMood = async (req, res, next) => {
  try {
    const { mood } = req.params;
    const { page = 1, limit = 20, intensity = 50 } = req.query;

    // Validate mood
    const validMoods = ['happy', 'sad', 'calm', 'energetic', 'romantic', 'melancholy', 'focus', 'hyper', 'chilled'];
    if (!validMoods.includes(mood)) {
      throw ApiError.badRequest(
        `Invalid mood: "${mood}". Valid moods: ${validMoods.join(', ')}`
      );
    }

    const result = await getRecommendations(mood, {
      limit: parseInt(limit),
      page: parseInt(page),
      intensity: parseInt(intensity),
    });

    return res.status(200).json(
      new ApiResponse(200, result, `Recommendations for mood: ${mood}`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/recommend/smart
 * Smart recommendations - classifies mood from text then recommends
 * Complete flow: text → NLP → mood → songs
 * 
 * @body {string} text - User's mood description
 * @body {number} limit - Number of songs
 */
const smartRecommendation = async (req, res, next) => {
  try {
    const { text, limit = 20 } = req.body;

    if (!text) {
      throw ApiError.badRequest('Please provide a text description of your mood');
    }

    // Step 1: Classify mood from text
    const moodResult = classifyMood(text);

    // Step 2: Get recommendations based on classified mood
    const recommendations = await getRecommendations(moodResult.mood, {
      limit: parseInt(limit),
      intensity: Math.round(moodResult.confidence * 100),
    });

    logger.info(`🧠 Smart recommendation: "${text}" → ${moodResult.mood} → ${recommendations.recommendations.length} songs`);

    return res.status(200).json(
      new ApiResponse(200, {
        moodAnalysis: moodResult,
        ...recommendations,
      }, `Smart recommendations for: "${text}"`)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendationsHandler,
  getRecommendationsByMood,
  smartRecommendation,
};
