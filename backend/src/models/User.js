/**
 * ============================================
 *  User Model - MongoDB Schema (Full Auth)
 * ============================================
 * 
 * Complete user model with:
 * - Authentication (bcrypt password hashing, JWT)
 * - Mood history tracking
 * - Listening history & spending time
 * - Favorites & preferences
 * - Forgot password support
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // ── Authentication Fields ──
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password in queries by default
    },

    avatar: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // ── Forgot Password ──
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // ── Mood History ──
    moodHistory: [
      {
        mood: {
          type: String,
          enum: ['happy', 'sad', 'calm', 'energetic', 'romantic', 'melancholy', 'focus', 'hyper', 'chilled'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        rawInput: {
          type: String,
          trim: true,
        },
      },
    ],

    // ── Listening History ──
    listeningHistory: [
      {
        song: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Song',
        },
        songTitle: String,
        songArtist: String,
        songMood: String,
        listenedAt: {
          type: Date,
          default: Date.now,
        },
        duration: {
          type: Number, // seconds spent listening
          default: 0,
        },
      },
    ],

    // ── Total Spending Time (in seconds) ──
    totalListeningTime: {
      type: Number,
      default: 0,
    },

    // ── User Preferences ──
    preferences: {
      favoriteGenres: {
        type: [String],
        default: [],
      },
      favoriteArtists: {
        type: [String],
        default: [],
      },
      defaultMood: {
        type: String,
        enum: ['happy', 'sad', 'calm', 'energetic', 'romantic', 'melancholy', 'focus', 'hyper', 'chilled'],
        default: 'chilled',
      },
    },

    // ── Favorite Song IDs ──
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song',
      },
    ],

    // ── Account Status ──
    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Index ──
userSchema.index({ email: 1 });

// ── Hash password before saving ──
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare entered password with stored hash ──
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Generate forgot password reset token ──
userSchema.methods.getResetPasswordToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash it and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// ── Add mood to history ──
userSchema.methods.addMoodToHistory = async function (mood, rawInput = '') {
  this.moodHistory.push({ mood, rawInput });
  // Keep only last 200 entries
  if (this.moodHistory.length > 200) {
    this.moodHistory = this.moodHistory.slice(-200);
  }
  await this.save();
};

// ── Add song to listening history ──
userSchema.methods.addToListeningHistory = async function (songData, duration = 0) {
  this.listeningHistory.push({
    song: songData._id || songData.id,
    songTitle: songData.title,
    songArtist: songData.artist,
    songMood: songData.mood,
    duration,
  });

  // Update total listening time
  this.totalListeningTime += duration;

  // Keep only last 500 entries
  if (this.listeningHistory.length > 500) {
    this.listeningHistory = this.listeningHistory.slice(-500);
  }
  await this.save();
};

// ── Get most frequent mood ──
userSchema.methods.getMostFrequentMood = function () {
  if (this.moodHistory.length === 0) return null;
  const counts = {};
  this.moodHistory.forEach(({ mood }) => {
    counts[mood] = (counts[mood] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

// ── Get top artists from listening history ──
userSchema.methods.getTopArtists = function (limit = 5) {
  const counts = {};
  this.listeningHistory.forEach(({ songArtist }) => {
    if (songArtist) counts[songArtist] = (counts[songArtist] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([artist, count]) => ({ artist, count }));
};

const User = mongoose.model('User', userSchema);

module.exports = User;
