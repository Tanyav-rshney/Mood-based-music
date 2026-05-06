/**
 * ============================================
 *  Mood Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { processMood, getAvailableMoods } = require('../controllers/moodController');
const { writeLimiter } = require('../middleware/rateLimiter');

// POST /api/mood - Classify mood from text input
router.post('/', writeLimiter, processMood);

// GET /api/mood/supported - Get all supported moods
router.get('/supported', getAvailableMoods);

module.exports = router;
