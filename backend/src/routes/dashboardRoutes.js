/**
 * Dashboard Routes
 */
const express = require('express');
const router = express.Router();
const {
  getDashboard, trackListen, trackMood, toggleFavorite, getListeningHistory,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(protect);

router.get('/', getDashboard);
router.post('/listen', trackListen);
router.post('/mood', trackMood);
router.post('/favorite', toggleFavorite);
router.get('/history', getListeningHistory);

module.exports = router;
