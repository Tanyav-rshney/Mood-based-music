/**
 * ============================================
 *  Song Model - MongoDB Schema
 * ============================================
 * 
 * Stores all song data in the database.
 * Each song has a mood tag used for mood-based recommendations.
 * 
 * Fields:
 * - title: Song name
 * - artist: Artist/band name
 * - genre: Music genre (e.g., Pop, Rock, Bollywood)
 * - mood: Mood classification (happy, sad, calm, energetic, romantic, etc.)
 * - image: Album art / cover image URL
 * - audioUrl: Direct link to audio file or stream
 * - genres: Array of genre tags for flexible categorization
 * - audioFeatures: Optional metadata for ML integration later
 * - popularity: Score for ranking recommendations
 */

const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    // Basic Song Information
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true,
      index: true,  // Index for fast search queries
    },

    artist: {
      type: String,
      required: [true, 'Artist name is required'],
      trim: true,
      index: true,
    },

    genre: {
      type: String,
      trim: true,
      default: 'Unknown',
    },

    // Array of genres for flexible tagging (matches frontend format)
    genres: {
      type: [String],
      default: [],
    },

    // Mood classification - core of recommendation system
    mood: {
      type: String,
      required: [true, 'Mood classification is required'],
      enum: {
        values: ['happy', 'sad', 'calm', 'energetic', 'romantic', 'melancholy', 'focus', 'hyper', 'chilled'],
        message: '{VALUE} is not a valid mood. Use: happy, sad, calm, energetic, romantic, melancholy, focus, hyper, chilled',
      },
      index: true,  // Index for fast mood-based queries
    },

    // Media URLs
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop',
    },

    audioUrl: {
      type: String,
      default: '',
    },

    // Audio features for future ML integration
    // These map to Spotify's audio features API or custom analysis
    audioFeatures: {
      energy: { type: Number, min: 0, max: 1, default: 0.5 },
      valence: { type: Number, min: 0, max: 1, default: 0.5 },       // Musical positivity
      danceability: { type: Number, min: 0, max: 1, default: 0.5 },
      tempo: { type: Number, default: 120 },                          // BPM
      acousticness: { type: Number, min: 0, max: 1, default: 0.5 },
      instrumentalness: { type: Number, min: 0, max: 1, default: 0 },
    },

    // Popularity score (0-100) for ranking
    popularity: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },

    // Play count for analytics
    playCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,  // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for optimized mood + genre queries
songSchema.index({ mood: 1, genre: 1 });
songSchema.index({ mood: 1, popularity: -1 });

// Text index for full-text search on title and artist
songSchema.index({ title: 'text', artist: 'text' });

// Virtual field: generate a frontend-compatible ID
songSchema.virtual('trackId').get(function () {
  return `track-${this._id}`;
});

/**
 * Static method: Find songs by mood with pagination
 * @param {string} mood - Mood to filter by
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {Promise<{songs: Array, total: number, pages: number}>}
 */
songSchema.statics.findByMood = async function (mood, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const [songs, total] = await Promise.all([
    this.find({ mood })
      .sort({ popularity: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ mood }),
  ]);

  return {
    songs,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
};

/**
 * Static method: Search songs by title or artist
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>}
 */
songSchema.statics.search = async function (query, limit = 20) {
  return this.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { artist: { $regex: query, $options: 'i' } },
      { genre: { $regex: query, $options: 'i' } },
    ],
  })
    .sort({ popularity: -1 })
    .limit(limit)
    .lean();
};

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
