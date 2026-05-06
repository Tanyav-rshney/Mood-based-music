/**
 * ============================================
 *  Recommendation Service - Core Engine
 * ============================================
 * 
 * Heart of the recommendation system.
 * Takes a classified mood and returns personalized song recommendations.
 * 
 * ALGORITHM:
 * 1. Fetch songs matching the primary mood from MongoDB
 * 2. Fetch songs from related moods (for diversity)
 * 3. Blend results with weighted randomization
 * 4. Apply scoring based on popularity + audio features
 * 5. Return ranked results
 * 
 * CACHING:
 * - Results are cached by mood for fast repeated requests
 * - Cache is invalidated when new songs are added
 */

const Song = require('../models/Song');
const cache = require('../config/cache');
const logger = require('../config/logger');

// =============================================
//  MOOD RELATIONSHIP MAP
// =============================================
// Defines which moods are "related" for diversity in recommendations.
// Primary mood gets 70% weight, related moods get 30%.

const MOOD_RELATIONS = {
  happy:      ['energetic', 'hyper', 'chilled'],
  sad:        ['melancholy', 'calm'],
  calm:       ['chilled', 'focus', 'melancholy'],
  energetic:  ['hyper', 'happy'],
  romantic:   ['calm', 'melancholy', 'happy'],
  melancholy: ['sad', 'calm', 'romantic'],
  focus:      ['calm', 'chilled'],
  hyper:      ['energetic', 'happy'],
  chilled:    ['calm', 'happy', 'focus'],
};

/**
 * Get song recommendations based on mood
 * 
 * @param {string} mood - Classified mood
 * @param {Object} options - Additional options
 * @param {number} options.limit - Number of songs to return (default: 20)
 * @param {number} options.page - Page number for pagination
 * @param {number} options.intensity - Mood intensity (0-100), affects how strictly we match
 * @param {string} options.query - Optional text query to filter
 * @returns {Promise<Object>} Recommendation results
 */
const getRecommendations = async (mood, options = {}) => {
  const {
    limit = 20,
    page = 1,
    intensity = 50,
    query = '',
  } = options;

  // Check cache first
  const cacheKey = `recommendations:${mood}:${page}:${limit}:${intensity}`;
  const cached = cache.get(cacheKey);
  if (cached && !query) {
    logger.debug(`📦 Cache hit for mood: ${mood}`);
    return { ...cached, source: 'cache' };
  }

  try {
    // Step 1: Fetch primary mood songs
    const primarySongs = await Song.find({ mood })
      .sort({ popularity: -1, createdAt: -1 })
      .lean();

    // Step 2: Fetch related mood songs for diversity
    const relatedMoods = MOOD_RELATIONS[mood] || [];
    let relatedSongs = [];

    if (intensity < 80) {
      // Lower intensity = more variety from related moods
      relatedSongs = await Song.find({
        mood: { $in: relatedMoods },
      })
        .sort({ popularity: -1 })
        .limit(Math.floor(limit * 0.3))
        .lean();
    }

    // Step 3: Blend and score results
    const scoredSongs = [
      ...primarySongs.map((song) => ({
        ...song,
        _score: calculateScore(song, mood, true),
      })),
      ...relatedSongs.map((song) => ({
        ...song,
        _score: calculateScore(song, mood, false) * 0.7, // Related songs get lower base score
      })),
    ];

    // Step 4: Sort by score, add randomization for freshness
    const shuffledSongs = scoredSongs
      .map((song) => ({
        ...song,
        _sortKey: song._score + Math.random() * 0.2, // Small random factor for variety
      }))
      .sort((a, b) => b._sortKey - a._sortKey);

    // Step 5: Apply text query filter if present
    let filteredSongs = shuffledSongs;
    if (query) {
      const q = query.toLowerCase();
      filteredSongs = shuffledSongs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.genres && s.genres.some((g) => g.toLowerCase().includes(q)))
      );
    }

    // Step 6: Paginate
    const startIndex = (page - 1) * limit;
    const paginatedSongs = filteredSongs.slice(startIndex, startIndex + limit);

    // Step 7: Format for frontend compatibility
    const recommendations = paginatedSongs.map(formatSongForFrontend);

    // Build explanation text
    const explanation = buildExplanation(mood, recommendations.length, intensity, query);

    const result = {
      recommendations,
      explanation,
      mood,
      total: filteredSongs.length,
      page,
      pages: Math.ceil(filteredSongs.length / limit),
      source: 'database',
    };

    // Cache the result (only if no text query - queries are too variable)
    if (!query) {
      cache.set(cacheKey, result);
    }

    logger.info(`🎵 Recommended ${recommendations.length} songs for mood: ${mood} (page ${page})`);
    return result;

  } catch (error) {
    logger.error(`❌ Recommendation error: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate a relevance score for a song
 * @param {Object} song - Song document
 * @param {string} targetMood - Target mood
 * @param {boolean} isPrimary - Is this a primary mood match?
 * @returns {number} Score between 0 and 1
 */
const calculateScore = (song, targetMood, isPrimary) => {
  let score = isPrimary ? 0.7 : 0.3;

  // Boost by popularity (normalized to 0-0.2)
  score += (song.popularity || 50) / 500;

  // Boost by audio features alignment with mood
  if (song.audioFeatures) {
    const moodFeatureMap = {
      happy:      { energy: 0.7, valence: 0.8, danceability: 0.6 },
      sad:        { energy: 0.3, valence: 0.2, danceability: 0.3 },
      calm:       { energy: 0.2, valence: 0.5, danceability: 0.3 },
      energetic:  { energy: 0.9, valence: 0.7, danceability: 0.8 },
      romantic:   { energy: 0.4, valence: 0.6, danceability: 0.4 },
      melancholy: { energy: 0.3, valence: 0.3, danceability: 0.3 },
      focus:      { energy: 0.4, valence: 0.5, danceability: 0.3 },
      hyper:      { energy: 1.0, valence: 0.8, danceability: 0.9 },
      chilled:    { energy: 0.3, valence: 0.5, danceability: 0.4 },
    };

    const targetFeatures = moodFeatureMap[targetMood] || {};
    let featureScore = 0;
    let featureCount = 0;

    for (const [feature, targetValue] of Object.entries(targetFeatures)) {
      if (song.audioFeatures[feature] !== undefined) {
        // Lower distance = better match
        const distance = Math.abs(song.audioFeatures[feature] - targetValue);
        featureScore += 1 - distance;
        featureCount++;
      }
    }

    if (featureCount > 0) {
      score += (featureScore / featureCount) * 0.1;
    }
  }

  return Math.min(score, 1.0);
};

/**
 * Format a song document for frontend consumption
 * Ensures compatibility with the existing React TrackCard component
 * 
 * @param {Object} song - MongoDB song document
 * @returns {Object} Frontend-compatible song object
 */
const formatSongForFrontend = (song) => ({
  id: song._id.toString(),
  title: song.title,
  artist: song.artist,
  genres: song.genres && song.genres.length > 0 ? song.genres : [song.genre || 'Unknown'],
  image: song.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop',
  audioUrl: song.audioUrl || '',
  mood: song.mood,
  popularity: song.popularity,
});

/**
 * Build a human-readable explanation for the recommendations
 */
const buildExplanation = (mood, count, intensity, query) => {
  const moodEmojis = {
    happy: '😊', sad: '😢', calm: '🧘', energetic: '🔥',
    romantic: '💕', melancholy: '🌙', focus: '🎯', hyper: '⚡', chilled: '🌊',
  };

  const emoji = moodEmojis[mood] || '🎵';
  let explanation = `${emoji} Found ${count} tracks for your "${mood}" mood`;

  if (intensity > 75) {
    explanation += ' with high intensity focus';
  } else if (intensity < 30) {
    explanation += ' with a diverse mix';
  }

  if (query) {
    explanation += ` matching "${query}"`;
  }

  return explanation + '.';
};

/**
 * Invalidate recommendation cache
 * Called when new songs are added to the database
 */
const invalidateCache = () => {
  cache.flushAll();
  logger.info('🗑️ Recommendation cache cleared');
};

module.exports = {
  getRecommendations,
  invalidateCache,
  formatSongForFrontend,
};
