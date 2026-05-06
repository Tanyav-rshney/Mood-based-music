/**
 * ============================================
 *  Dashboard Controller
 * ============================================
 * 
 * Provides user dashboard data:
 * - Listening stats (total time, songs played)
 * - Mood history & analytics
 * - Listening history
 * - Top artists
 * - Favorite songs
 */

const User = require('../models/User');
const Song = require('../models/Song');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * GET /api/dashboard
 * Get complete dashboard data for logged-in user
 */
const getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favorites', 'title artist mood image audioUrl genres popularity');

    // ── Listening Stats ──
    const totalSeconds = user.totalListeningTime || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    // ── Mood Analytics ──
    const moodCounts = {};
    user.moodHistory.forEach(({ mood }) => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const moodAnalytics = Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: user.moodHistory.length > 0
          ? Math.round((count / user.moodHistory.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ── Top Artists ──
    const artistCounts = {};
    user.listeningHistory.forEach(({ songArtist }) => {
      if (songArtist) artistCounts[songArtist] = (artistCounts[songArtist] || 0) + 1;
    });
    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, count]) => ({ artist, count }));

    // ── Recent Listening History (last 20) ──
    const recentHistory = user.listeningHistory
      .slice(-20)
      .reverse()
      .map((entry) => ({
        songTitle: entry.songTitle,
        songArtist: entry.songArtist,
        songMood: entry.songMood,
        listenedAt: entry.listenedAt,
        duration: entry.duration,
      }));

    // ── Mood History Timeline (last 30) ──
    const moodTimeline = user.moodHistory
      .slice(-30)
      .reverse()
      .map((entry) => ({
        mood: entry.mood,
        rawInput: entry.rawInput,
        timestamp: entry.timestamp,
      }));

    // ── Most Played Mood ──
    const favoriteMood = moodAnalytics.length > 0 ? moodAnalytics[0].mood : 'chilled';

    // ── Daily Listening (last 7 days) ──
    const now = new Date();
    const dailyListening = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];

      const dayEntries = user.listeningHistory.filter((entry) => {
        const entryDate = new Date(entry.listenedAt).toISOString().split('T')[0];
        return entryDate === dayStr;
      });

      const totalDaySeconds = dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

      dailyListening.push({
        date: dayStr,
        day: day.toLocaleDateString('en-US', { weekday: 'short' }),
        songsPlayed: dayEntries.length,
        minutesListened: Math.round(totalDaySeconds / 60),
      });
    }

    res.status(200).json(
      new ApiResponse(200, {
        user: {
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          memberSince: user.createdAt,
          lastLogin: user.lastLogin,
        },
        stats: {
          totalListeningTime: {
            seconds: totalSeconds,
            formatted: `${hours}h ${minutes}m`,
            hours,
            minutes,
          },
          totalSongsPlayed: user.listeningHistory.length,
          totalMoodsExplored: Object.keys(moodCounts).length,
          favoriteMood,
          favoritesCount: user.favorites.length,
        },
        moodAnalytics,
        topArtists,
        recentHistory,
        moodTimeline,
        dailyListening,
        favorites: user.favorites,
      }, 'Dashboard data fetched')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/listen
 * Track a song listen event
 */
const trackListen = async (req, res, next) => {
  try {
    const { songId, songTitle, songArtist, songMood, duration = 0 } = req.body;

    if (!songTitle) {
      throw ApiError.badRequest('Song title is required');
    }

    const user = await User.findById(req.user._id);

    // Add to listening history
    user.listeningHistory.push({
      song: songId || null,
      songTitle,
      songArtist: songArtist || 'Unknown',
      songMood: songMood || 'chilled',
      duration: parseInt(duration) || 0,
    });

    // Update total time
    user.totalListeningTime += parseInt(duration) || 0;

    // Keep only last 500 entries
    if (user.listeningHistory.length > 500) {
      user.listeningHistory = user.listeningHistory.slice(-500);
    }

    await user.save();

    logger.debug(`🎧 Listen tracked: "${songTitle}" by ${songArtist} for user ${user.email}`);

    res.status(200).json(
      new ApiResponse(200, {
        totalListeningTime: user.totalListeningTime,
        historyCount: user.listeningHistory.length,
      }, 'Listen event tracked')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/mood
 * Track a mood selection/search
 */
const trackMood = async (req, res, next) => {
  try {
    const { mood, rawInput = '' } = req.body;

    if (!mood) {
      throw ApiError.badRequest('Mood is required');
    }

    const user = await User.findById(req.user._id);
    await user.addMoodToHistory(mood, rawInput);

    res.status(200).json(
      new ApiResponse(200, {
        moodHistoryCount: user.moodHistory.length,
      }, 'Mood tracked')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dashboard/favorite
 * Toggle a song as favorite
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const { songId } = req.body;

    if (!songId) {
      throw ApiError.badRequest('Song ID is required');
    }

    const user = await User.findById(req.user._id);

    const index = user.favorites.indexOf(songId);
    if (index > -1) {
      // Remove from favorites
      user.favorites.splice(index, 1);
      await user.save();
      res.status(200).json(
        new ApiResponse(200, { isFavorite: false, favoritesCount: user.favorites.length }, 'Removed from favorites')
      );
    } else {
      // Add to favorites
      user.favorites.push(songId);
      await user.save();
      res.status(200).json(
        new ApiResponse(200, { isFavorite: true, favoritesCount: user.favorites.length }, 'Added to favorites')
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/history
 * Get full listening history with pagination
 */
const getListeningHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id);

    const history = user.listeningHistory
      .slice()
      .reverse();

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginatedHistory = history.slice(startIndex, startIndex + parseInt(limit));

    res.status(200).json(
      new ApiResponse(200, {
        history: paginatedHistory,
        total: history.length,
        page: parseInt(page),
        pages: Math.ceil(history.length / parseInt(limit)),
      }, 'Listening history fetched')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  trackListen,
  trackMood,
  toggleFavorite,
  getListeningHistory,
};
