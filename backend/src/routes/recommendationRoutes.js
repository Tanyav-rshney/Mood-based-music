/**
 * ============================================
 *  Recommendation Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const {
  getRecommendationsHandler,
  getRecommendationsByMood,
  smartRecommendation,
} = require('../controllers/recommendationController');

// POST /api/recommendations - Main endpoint (used by frontend)
router.post('/', getRecommendationsHandler);

// GET /api/recommend/:mood - Get recommendations by mood (REST style)
router.get('/:mood', getRecommendationsByMood);

// POST /api/recommend/smart - Smart text-to-recommendations
router.post('/smart', smartRecommendation);

module.exports = router;
