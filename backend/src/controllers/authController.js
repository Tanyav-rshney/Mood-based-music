/**
 * ============================================
 *  Auth Controller - Registration, Login, Forgot Password
 * ============================================
 */

const crypto = require('crypto');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { generateToken } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * POST /api/auth/register
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate
    if (!name || !email || !password) {
      throw ApiError.badRequest('Name, email, and password are required');
    }

    if (password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.badRequest('User with this email already exists');
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate JWT token
    const token = generateToken(user._id);

    logger.info(`👤 New user registered: ${email}`);

    res.status(201).json(
      new ApiResponse(201, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      }, 'Registration successful')
    );
  } catch (error) {
    if (error.code === 11000) {
      return next(ApiError.badRequest('Email already registered'));
    }
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login with email and password
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logger.info(`🔑 User logged in: ${email}`);

    res.status(200).json(
      new ApiResponse(200, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          totalListeningTime: user.totalListeningTime,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        token,
      }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current logged-in user profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites', 'title artist mood image audioUrl genres');

    res.status(200).json(
      new ApiResponse(200, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          preferences: user.preferences,
          totalListeningTime: user.totalListeningTime,
          moodHistoryCount: user.moodHistory.length,
          listeningHistoryCount: user.listeningHistory.length,
          favoritesCount: user.favorites.length,
          favorites: user.favorites,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      }, 'Profile fetched')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, preferences } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json(
      new ApiResponse(200, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          preferences: user.preferences,
        },
      }, 'Profile updated')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Send password reset token (simulated - logs to console)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw ApiError.notFound('No account found with this email');
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // In production, send email with reset link
    // For now, we log the token and return it in response (dev mode)
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    logger.info(`📧 Password reset requested for: ${email}`);
    logger.info(`🔗 Reset URL: ${resetUrl}`);

    res.status(200).json(
      new ApiResponse(200, {
        message: 'Password reset token generated',
        // In production, remove resetToken from response and send via email
        resetToken,
        resetUrl,
      }, 'Password reset link generated. Check your email.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Reset password using token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password || password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }

    // Hash the token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new login token
    const loginToken = generateToken(user._id);

    logger.info(`🔐 Password reset successful for: ${user.email}`);

    res.status(200).json(
      new ApiResponse(200, {
        token: loginToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      }, 'Password reset successful. You are now logged in.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-password
 * Change password (requires old password)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest('Current password and new password are required');
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json(
      new ApiResponse(200, { token }, 'Password changed successfully')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
