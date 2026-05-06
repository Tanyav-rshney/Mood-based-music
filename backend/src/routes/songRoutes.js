/**
 * ============================================
 *  Song Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const {
  getAllSongs,
  getSongById,
  addSong,
  addBulkSongs,
  deleteSong,
} = require('../controllers/songController');
const { writeLimiter } = require('../middleware/rateLimiter');

// GET /api/songs - Get all songs with filtering & pagination
router.get('/', getAllSongs);

// GET /api/songs/:id - Get song by ID
router.get('/:id', getSongById);

// POST /api/songs - Add a new song
router.post('/', writeLimiter, addSong);

// POST /api/songs/bulk - Add multiple songs at once
router.post('/bulk', writeLimiter, addBulkSongs);

// DELETE /api/songs/:id - Delete a song
router.delete('/:id', writeLimiter, deleteSong);

module.exports = router;
