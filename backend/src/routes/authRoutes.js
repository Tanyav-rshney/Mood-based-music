/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const {
  register, login, getMe, updateProfile,
  forgotPassword, resetPassword, changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');

router.post('/register', writeLimiter, register);
router.post('/login', writeLimiter, login);
router.post('/forgot-password', writeLimiter, forgotPassword);
router.post('/reset-password/:token', writeLimiter, resetPassword);

// Protected routes (require login)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

module.exports = router;
