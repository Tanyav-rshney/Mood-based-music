/**
 * ============================================
 *  Mood Controller - API Handlers
 * ============================================
 * 
 * Handles mood classification requests.
 * Works with the NLP mood service to process user input.
 */

const { classifyMood, getSupportedMoods } = require('../services/moodService');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * POST /api/mood
 * Classify user's mood from text input
 * 
 * @body {string} text - User's mood description (e.g., "I'm feeling happy today")
 * @body {string} mood - Direct mood selection (optional, if user picks from UI)
 * 
 * @returns {Object} Classified mood with confidence score
 */
const processMood = async (req, res, next) => {
  try {
    const { text, mood: directMood } = req.body;

    // If user selected a mood directly from the UI, return it as-is
    if (directMood) {
      const validMoods = getSupportedMoods().map((m) => m.id);
      if (!validMoods.includes(directMood)) {
        throw ApiError.badRequest(
          `Invalid mood: "${directMood}". Valid moods: ${validMoods.join(', ')}`
        );
      }

      logger.info(`🎭 Direct mood selected: ${directMood}`);
      return res.status(200).json(
        new ApiResponse(200, {
          mood: directMood,
          confidence: 1.0,
          method: 'direct_selection',
          keywords: [directMood],
          sentiment: 0,
        }, `Mood classified as: ${directMood}`)
      );
    }

    // Classify mood from text
    if (!text || text.trim().length === 0) {
      throw ApiError.badRequest('Please provide a mood text or select a mood');
    }

    const result = classifyMood(text);
    
    logger.info(`🎭 Mood classified: "${text}" → ${result.mood} (${result.confidence})`);

    return res.status(200).json(
      new ApiResponse(200, result, `Mood classified as: ${result.mood}`)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/mood/supported
 * Get list of all supported moods
 * 
 * @returns {Array} List of mood objects with id, emoji, label, description
 */
const getAvailableMoods = async (req, res, next) => {
  try {
    const moods = getSupportedMoods();
    
    return res.status(200).json(
      new ApiResponse(200, { moods }, `${moods.length} moods available`)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processMood,
  getAvailableMoods,
};
