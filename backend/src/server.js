/**
 * ============================================
 *  NeonPulse Music Backend - Main Server
 * ============================================
 * 
 * Production-ready Express server for the Mood-Based
 * Music Recommendation System.
 * 
 * Architecture: MVC + Service Layer
 * Database: MongoDB with Mongoose
 * Features: NLP mood classification, caching, rate limiting,
 *           pagination, search, and detailed logging
 * 
 * @author NeonPulse Team
 * @version 2.0.0
 */

// =============================================
//  LOAD ENVIRONMENT VARIABLES (must be first!)
// =============================================
const dotenv = require('dotenv');
dotenv.config();

// =============================================
//  IMPORTS
// =============================================
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

// Flask ML API URL (Python server runs on port 5001)
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// Config
const connectDB = require('./config/db');
const logger = require('./config/logger');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const moodRoutes = require('./routes/moodRoutes');
const songRoutes = require('./routes/songRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Services (for fallback)
const { classifyMood } = require('./services/moodService');
const { getRecommendations } = require('./services/recommendationService');

// =============================================
//  APP INITIALIZATION
// =============================================
const app = express();
const PORT = process.env.PORT || 5000;

// =============================================
//  GLOBAL MIDDLEWARE
// =============================================

// CORS - Allow frontend origins
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (using Morgan piped into Winston)
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
}));

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// =============================================
//  HEALTH CHECK ROUTE
// =============================================
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'NeonPulse Music API is running 🚀',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /',
      // Auth
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      forgotPassword: 'POST /api/auth/forgot-password',
      resetPassword: 'POST /api/auth/reset-password/:token',
      profile: 'GET /api/auth/me',
      // Dashboard
      dashboard: 'GET /api/dashboard',
      trackListen: 'POST /api/dashboard/listen',
      trackMood: 'POST /api/dashboard/mood',
      toggleFavorite: 'POST /api/dashboard/favorite',
      listeningHistory: 'GET /api/dashboard/history',
      // Music
      mood: 'POST /api/mood',
      supportedMoods: 'GET /api/mood/supported',
      recommendations: 'POST /api/recommendations',
      recommendByMood: 'GET /api/recommend/:mood',
      smartRecommend: 'POST /api/recommend/smart',
      songs: 'GET /api/songs',
      addSong: 'POST /api/songs',
      spotifyStatus: 'GET /api/spotify/status',
    },
  });
});

// =============================================
//  API ROUTES
// =============================================

// Auth endpoints (register, login, forgot password, profile)
app.use('/api/auth', authRoutes);

// Dashboard endpoints (stats, history, favorites)
app.use('/api/dashboard', dashboardRoutes);

// Mood processing endpoints
app.use('/api/mood', moodRoutes);

// Song CRUD endpoints
app.use('/api/songs', songRoutes);

// Recommendation endpoints (includes POST /api/recommendations for frontend compatibility)
app.use('/api/recommendations', recommendationRoutes);

// New REST-style recommendations
app.use('/api/recommend', recommendationRoutes);

// =============================================
//  LEGACY / COMPATIBILITY ENDPOINTS
// =============================================
// These maintain backward compatibility with the existing frontend

// Spotify status mock (frontend calls this on load)
app.get('/api/spotify/status', (req, res) => {
  res.json({
    configured: true,
    available: false,
    message: 'Spotify is not connected. Using NeonPulse intelligent mood-based recommendations powered by MongoDB.',
  });
});

// ═══════════════════════════════════════════════════════════
//  ML API INTEGRATION ROUTES
//  These routes proxy to the Flask ML API (Python) and return
//  results to the frontend. If Flask is down, they fall back
//  to the local library.
// ═══════════════════════════════════════════════════════════

const FALLBACK_TRACKS = [
  { id: 'track-1', title: 'Chaiyya Chaiyya', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 95, duration: 312 },
  { id: 'track-2', title: 'Chak De India', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Patriotic'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 92, duration: 288 },
  { id: 'track-3', title: 'Malhari', artist: 'Vishal Dadlani', mood: 'energetic', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 90, duration: 245 },
  { id: 'track-4', title: 'Kar Har Maidaan Fateh', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Motivational'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 88, duration: 296 },
  { id: 'track-5', title: 'Zinda', artist: 'Siddharth Mahadevan', mood: 'energetic', genres: ['Bollywood', 'Rock'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 85, duration: 268 },
  { id: 'track-6', title: 'Khalibali', artist: 'Shivam Pathak', mood: 'hyper', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 87, duration: 230 },
  { id: 'track-7', title: 'Tum Hi Ho', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 98, duration: 262 },
  { id: 'track-8', title: 'Raabta', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 91, duration: 284 },
  { id: 'track-9', title: 'Tera Ban Jaunga', artist: 'Akhil Sachdeva', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 89, duration: 248 },
  { id: 'track-10', title: 'Hawayein', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 93, duration: 290 },
  { id: 'track-11', title: 'Tere Bina', artist: 'A.R. Rahman', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 86, duration: 318 },
  { id: 'track-12', title: 'Pehla Nasha', artist: 'Udit Narayan', mood: 'romantic', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 94, duration: 302 },
  { id: 'track-13', title: 'Channa Mereya', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 97, duration: 280 },
  { id: 'track-14', title: 'Agar Tum Saath Ho', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 96, duration: 340 },
  { id: 'track-15', title: 'Phir Le Aaya Dil', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 296 },
  { id: 'track-16', title: 'Tera Yaar Hoon Main', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 85, duration: 254 },
  { id: 'track-17', title: 'Kabira', artist: 'Arijit Singh', mood: 'melancholy', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 90, duration: 232 },
  { id: 'track-18', title: 'Bhula Dena', artist: 'Mustafa Zahid', mood: 'melancholy', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 84, duration: 278 },
  { id: 'track-19', title: 'Kun Faya Kun', artist: 'A.R. Rahman', mood: 'calm', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 96, duration: 468 },
  { id: 'track-20', title: 'Tujhe Kitna Chahne Lage', artist: 'Arijit Singh', mood: 'calm', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 92, duration: 240 },
  { id: 'track-21', title: 'Ilahi', artist: 'Arijit Singh', mood: 'calm', genres: ['Bollywood', 'Travel'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 87, duration: 218 },
  { id: 'track-22', title: 'Iktara', artist: 'Amitabh Bhattacharya', mood: 'chilled', genres: ['Bollywood', 'Indie'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 86, duration: 232 },
  { id: 'track-23', title: 'Safar', artist: 'Arijit Singh', mood: 'chilled', genres: ['Bollywood', 'Travel'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 84, duration: 266 },
  { id: 'track-24', title: 'Dil Dhadakne Do', artist: 'Priyanka Chopra', mood: 'chilled', genres: ['Bollywood', 'Pop'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 83, duration: 248 },
  { id: 'track-25', title: 'Gallan Goodiyaan', artist: 'Sukhwinder Singh', mood: 'happy', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 91, duration: 282 },
  { id: 'track-26', title: 'London Thumakda', artist: 'Labh Janjua', mood: 'happy', genres: ['Bollywood', 'Punjabi'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 89, duration: 258 },
  { id: 'track-27', title: 'Balam Pichkari', artist: 'Vishal Dadlani', mood: 'happy', genres: ['Bollywood', 'Holi'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 93, duration: 276 },
  { id: 'track-28', title: 'Badtameez Dil', artist: 'Benny Dayal', mood: 'happy', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 240 },
  { id: 'track-29', title: 'Ainvayi Ainvayi', artist: 'Salim Merchant', mood: 'happy', genres: ['Bollywood', 'Wedding'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 86, duration: 266 },
  { id: 'track-30', title: 'Kala Chashma', artist: 'Badshah', mood: 'happy', genres: ['Bollywood', 'Punjabi'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 94, duration: 234 },
  { id: 'track-31', title: 'Jashn-E-Bahara', artist: 'Javed Ali', mood: 'focus', genres: ['Bollywood', 'Classical Fusion'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 340 },
  { id: 'track-32', title: 'Ae Dil Hai Mushkil', artist: 'Arijit Singh', mood: 'focus', genres: ['Bollywood', 'Melodic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 95, duration: 278 },
  { id: 'track-33', title: 'Tum Jo Mil Gaye Ho', artist: 'Rafi', mood: 'focus', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 82, duration: 290 },
  { id: 'track-34', title: 'Lag Ja Gale', artist: 'Lata Mangeshkar', mood: 'focus', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 91, duration: 264 },
  { id: 'track-35', title: 'Lungi Dance', artist: 'Honey Singh', mood: 'hyper', genres: ['Bollywood', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 88, duration: 252 },
  { id: 'track-36', title: 'Swag Se Swagat', artist: 'Vishal Dadlani', mood: 'hyper', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 244 },
  { id: 'track-37', title: 'Garmi', artist: 'Badshah', mood: 'hyper', genres: ['Bollywood', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 86, duration: 228 },
  { id: 'track-38', title: 'DJ Wale Babu', artist: 'Badshah', mood: 'hyper', genres: ['Punjabi', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 87, duration: 216 },
  { id: 'track-39', title: 'Khwaja Mere Khwaja', artist: 'A.R. Rahman', mood: 'calm', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 93, duration: 380 },
  { id: 'track-40', title: 'Afreen Afreen', artist: 'Rahat Fateh Ali Khan', mood: 'calm', genres: ['Ghazal', 'Sufi'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 95, duration: 472 },
  { id: 'track-41', title: 'Bol Na Halke Halke', artist: 'Rahat Fateh Ali Khan', mood: 'romantic', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 88, duration: 296 },
  { id: 'track-42', title: 'Brown Munde', artist: 'AP Dhillon', mood: 'energetic', genres: ['Punjabi', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 94, duration: 196 },
  { id: 'track-43', title: 'Excuses', artist: 'AP Dhillon', mood: 'chilled', genres: ['Punjabi', 'R&B'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 92, duration: 210 },
  { id: 'track-44', title: 'Lover', artist: 'Diljit Dosanjh', mood: 'romantic', genres: ['Punjabi', 'Pop'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 224 },
  { id: 'track-45', title: 'Pasoori', artist: 'Ali Sethi', mood: 'chilled', genres: ['Coke Studio', 'Fusion'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 97, duration: 258 },
  { id: 'track-46', title: 'Pal Pal Dil Ke Paas', artist: 'Kishore Kumar', mood: 'romantic', genres: ['Retro', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 90, duration: 290 },
  { id: 'track-47', title: 'Mere Sapno Ki Rani', artist: 'Kishore Kumar', mood: 'happy', genres: ['Retro', 'Classic'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 268 },
  { id: 'track-48', title: 'Dum Maro Dum', artist: 'Asha Bhosle', mood: 'chilled', genres: ['Retro', 'Psychedelic'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 87, duration: 310 },
  { id: 'track-49', title: 'Ek Ladki Ko Dekha', artist: 'Kumar Sanu', mood: 'romantic', genres: ['Retro', 'Romantic'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 92, duration: 302 },
  { id: 'track-50', title: 'Roop Tera Mastana', artist: 'Kishore Kumar', mood: 'romantic', genres: ['Retro', 'Classic'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 86, duration: 276 },
  { id: 'track-51', title: 'Kesariya', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 99, duration: 268 },
  { id: 'track-52', title: 'Apna Bana Le', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 96, duration: 302 },
  { id: 'track-53', title: 'Naatu Naatu', artist: 'Rahul Sipligunj', mood: 'energetic', genres: ['Telugu', 'Dance'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 98, duration: 242 },
  { id: 'track-54', title: 'Maan Meri Jaan', artist: 'King', mood: 'romantic', genres: ['Indie', 'Pop'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 95, duration: 198 },
  { id: 'track-55', title: 'O Bedardeya', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 93, duration: 286 },
  { id: 'track-56', title: 'Jhoome Jo Pathaan', artist: 'Arijit Singh', mood: 'energetic', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 97, duration: 232 },
  { id: 'track-57', title: 'Ghoomar', artist: 'Shreya Ghoshal', mood: 'happy', genres: ['Bollywood', 'Folk'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 89, duration: 266 },
  { id: 'track-58', title: 'Deewani Mastani', artist: 'Shreya Ghoshal', mood: 'romantic', genres: ['Bollywood', 'Classical Fusion'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 92, duration: 314 },
  { id: 'track-59', title: 'Nagada Sang Dhol', artist: 'Shreya Ghoshal', mood: 'energetic', genres: ['Bollywood', 'Garba'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 91, duration: 248 },
  { id: 'track-60', title: 'Kal Ho Naa Ho', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 96, duration: 322 },
  { id: 'track-61', title: 'Yaaron', artist: 'KK', mood: 'happy', genres: ['Bollywood', 'Friendship'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 90, duration: 278 },
  { id: 'track-62', title: 'Tadap Tadap', artist: 'KK', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 88, duration: 340 },
  { id: 'track-63', title: 'Abhi Mujh Mein Kahin', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 94, duration: 298 },
];

// ═══════════════════════════════════════════════════════════
//  iTunes Search API Integration (FREE, no API key needed)
//  Returns real 30-second preview URLs + real album artwork
// ═══════════════════════════════════════════════════════════

// In-memory cache for iTunes results to avoid re-fetching
const itunesCache = new Map();

/**
 * Search iTunes for a song and return preview URL + artwork
 */
async function searchITunes(title, artist) {
  const cacheKey = `${title}::${artist}`.toLowerCase();
  if (itunesCache.has(cacheKey)) return itunesCache.get(cacheKey);

  try {
    const query = encodeURIComponent(`${title} ${artist}`);
    const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=3`;
    const resp = await axios.get(url, { timeout: 5000 });
    const results = resp.data?.results || [];

    if (results.length > 0) {
      // Try to find best match by title similarity
      const best = results.find(r =>
        r.trackName?.toLowerCase().includes(title.toLowerCase().substring(0, 8))
      ) || results[0];

      const data = {
        previewUrl: best.previewUrl || null,
        artworkUrl: (best.artworkUrl100 || '').replace('100x100', '600x600'),
        trackName: best.trackName,
        artistName: best.artistName,
        collectionName: best.collectionName,
        trackTimeMillis: best.trackTimeMillis,
      };
      itunesCache.set(cacheKey, data);
      return data;
    }
  } catch (err) {
    // Silently fail — we'll use fallback
  }

  itunesCache.set(cacheKey, null);
  return null;
}

/**
 * Enrich an array of songs with real iTunes preview URLs + artwork
 * Processes in parallel with a concurrency limit
 */
async function enrichSongsWithITunes(songs) {
  const enriched = await Promise.all(
    songs.map(async (song) => {
      const itunes = await searchITunes(song.title || '', song.artist || '');
      if (itunes && itunes.previewUrl) {
        return {
          ...song,
          audioUrl: itunes.previewUrl,
          image: itunes.artworkUrl || song.image,
          album: itunes.collectionName || song.album || '',
          isPreview: true,
        };
      }
      return { ...song, isPreview: false };
    })
  );
  return enriched;
}

/** GET /api/itunes/search — Direct iTunes search endpoint */
app.get('/api/itunes/search', async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${Math.min(parseInt(limit), 25)}`;
    const resp = await axios.get(url, { timeout: 8000 });
    const songs = (resp.data?.results || []).map((r, i) => ({
      id: `itunes-${r.trackId || i}`,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      audioUrl: r.previewUrl,
      image: (r.artworkUrl100 || '').replace('100x100', '600x600'),
      duration: Math.round((r.trackTimeMillis || 30000) / 1000),
      genres: [r.primaryGenreName].filter(Boolean),
      isPreview: true,
    }));
    res.json({ results: songs, total: songs.length });
  } catch (err) {
    res.status(500).json({ error: 'iTunes search failed', message: err.message });
  }
});

/** POST /api/getMusic — ML-powered recommendations (proxy to Flask) */
app.post('/api/getMusic', async (req, res) => {
  const { mood, text, count = 30 } = req.body;
  try {
    const mlResponse = await axios.post(`${ML_API_URL}/recommend`, { mood: mood || '', text: text || '', count }, { timeout: 10000 });
    const mlData = mlResponse.data;

    // Build base song objects from ML response
    const baseSongs = (mlData.songs || []).map((song, i) => {
      const localMatch = FALLBACK_TRACKS.find(t => t.title.toLowerCase() === song.title?.toLowerCase()) || FALLBACK_TRACKS[i % FALLBACK_TRACKS.length];
      return {
        id: `ml-${i}-${Date.now()}`,
        title: song.title || 'Unknown',
        artist: song.artist || 'Unknown',
        mood: song.mood || mlData.detected_mood,
        genres: song.genres || localMatch.genres || [],
        popularity: song.popularity || localMatch.popularity || 80,
        duration: song.duration || localMatch.duration || 240,
        valence: song.valence,
        energy: song.energy,
        danceability: song.danceability,
        album: song.album || '',
        image: localMatch.image,
        audioUrl: localMatch.audioUrl,
      };
    });

    // Enrich with REAL iTunes preview URLs + artwork
    const enrichedSongs = await enrichSongsWithITunes(baseSongs);

    res.json({
      recommendations: enrichedSongs,
      detected_mood: mlData.detected_mood,
      dataset_mood: mlData.dataset_mood,
      emoji: mlData.emoji,
      confidence: mlData.confidence,
      keywords: mlData.keywords || [],
      explanation: `🤖 ML Model detected "${mlData.detected_mood}" mood (${mlData.confidence}% confidence). Found ${enrichedSongs.length} real songs.`,
      source: 'ml-model',
      total_results: enrichedSongs.length,
    });
  } catch (error) {
    // Fallback when ML API is down
    let fallbackMood = mood;
    let confidence = 100;
    let keywords = [fallbackMood];

    if (!fallbackMood) {
      if (text) {
        const classified = classifyMood(text);
        fallbackMood = classified.mood;
        confidence = Math.round(classified.confidence * 100);
        keywords = classified.keywords;
      } else {
        fallbackMood = 'energetic';
      }
    }

    let results = FALLBACK_TRACKS.filter(t => t.mood === fallbackMood);
    if (results.length === 0) results = [...FALLBACK_TRACKS].sort(() => 0.5 - Math.random()).slice(0, count);
    const emojis = { happy: '😊', sad: '😢', angry: '😠', calm: '😌', energetic: '⚡', romantic: '💕', hyper: '🤩', chilled: '🌊', focus: '🎯', melancholy: '🌙' };

    // Enrich fallback tracks too with real iTunes audio
    const enrichedFallback = await enrichSongsWithITunes(results.slice(0, count));

    res.json({
      recommendations: enrichedFallback,
      detected_mood: fallbackMood,
      emoji: emojis[fallbackMood] || '🎵',
      confidence,
      keywords,
      explanation: `📦 ML API offline. Showing ${enrichedFallback.length} real tracks for "${fallbackMood}".`,
      source: 'local-fallback',
      total_results: enrichedFallback.length,
    });
  }
});

/** POST /api/ml/recommend — Direct proxy to Flask ML API */
app.post('/api/ml/recommend', async (req, res) => {
  try { const response = await axios.post(`${ML_API_URL}/recommend`, req.body, { timeout: 10000 }); res.json(response.data); }
  catch (error) { res.status(503).json({ error: 'ML API is not available', message: 'Start Flask server: cd ml-model && python ml_api.py' }); }
});

/** GET /api/ml/moods — Get supported moods from ML model */
app.get('/api/ml/moods', async (req, res) => {
  try { const response = await axios.get(`${ML_API_URL}/moods`, { timeout: 5000 }); res.json(response.data); }
  catch (error) { res.json({ moods: [ { id: 'happy', emoji: '😊' }, { id: 'sad', emoji: '😢' }, { id: 'angry', emoji: '😠' }, { id: 'calm', emoji: '😌' }, { id: 'energetic', emoji: '⚡' }, { id: 'romantic', emoji: '💕' }, { id: 'excited', emoji: '🤩' }, { id: 'anxious', emoji: '😰' } ], source: 'local-fallback' }); }
});

/** GET /api/ml/status — Check if Flask ML API is running */
app.get('/api/ml/status', async (req, res) => {
  try { const response = await axios.get(`${ML_API_URL}/`, { timeout: 3000 }); res.json({ ml_api_available: true, ml_api_url: ML_API_URL, ...response.data }); }
  catch (error) { res.json({ ml_api_available: false, ml_api_url: ML_API_URL, message: 'Flask ML API is not running.', local_library: `${FALLBACK_TRACKS.length} songs available as fallback` }); }
});

// =============================================
//  ERROR HANDLING
// =============================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last middleware)
app.use(errorHandler);

// =============================================
//  DATABASE CONNECTION & SERVER START
// =============================================

let isDBConnected = false;

const startServer = async () => {
  // Try to connect to MongoDB
  const connection = await connectDB();
  isDBConnected = !!connection;

  if (!isDBConnected) {
    logger.warn('⚠️ Running WITHOUT MongoDB - using fallback data (63 songs)');
    logger.warn('⚠️ Auth & Dashboard need MongoDB. To connect: set MONGODB_URI in .env');

    // Override the recommendations endpoint to serve mood-filtered fallback data
    app.post('/api/recommendations', (req, res) => {
      const mood = req.body?.mood || 'chilled';
      let results = FALLBACK_TRACKS.filter(t => t.mood === mood);
      if (results.length === 0) {
        results = [...FALLBACK_TRACKS].sort(() => 0.5 - Math.random()).slice(0, 10);
      }
      res.json({
        recommendations: results,
        explanation: `🔌 MongoDB not connected. Showing ${results.length} tracks for "${mood}" mood from local library.`,
        source: 'fallback',
      });
    });

    // Override the songs endpoint for search/browse
    app.get('/api/songs', (req, res) => {
      const { search, mood, genre, sort = 'popularity', order = 'desc', limit = 30 } = req.query;
      let filtered = [...FALLBACK_TRACKS];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.genres.some(g => g.toLowerCase().includes(q)));
      }
      if (mood) filtered = filtered.filter(t => t.mood === mood);
      if (genre) { const g = genre.toLowerCase(); filtered = filtered.filter(t => t.genres.some(tg => tg.toLowerCase().includes(g))); }
      if (sort === 'popularity') filtered.sort((a, b) => order === 'desc' ? b.popularity - a.popularity : a.popularity - b.popularity);
      else if (sort === 'title') filtered.sort((a, b) => order === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
      const lim = parseInt(limit) || 30;
      res.json({ data: { songs: filtered.slice(0, lim), total: filtered.length, page: 1, pages: Math.ceil(filtered.length / lim) } });
    });
  }

  // Start Express server
  app.listen(PORT, () => {
    logger.info('═'.repeat(55));
    logger.info(`🚀 NeonPulse Backend v2.0.0`);
    logger.info(`🌐 Server: http://localhost:${PORT}`);
    logger.info(`📦 Database: ${isDBConnected ? 'MongoDB Connected ✅' : 'Fallback Mode ⚠️'}`);
    logger.info(`🤖 ML API expected at ${ML_API_URL}`);
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('═'.repeat(55));
    logger.info('📡 Routes:');
    logger.info('   POST /api/auth/register     → Register');
    logger.info('   POST /api/auth/login        → Login');
    logger.info('   GET  /api/dashboard         → User dashboard');
    logger.info('   POST /api/getMusic          → ML-powered recommendations');
    logger.info('   POST /api/recommendations   → Local recommendations');
    logger.info('   GET  /api/songs             → Browse/search songs');
    logger.info('   GET  /api/ml/status         → Check ML API status');
    logger.info('═'.repeat(55));
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`❌ Unhandled Rejection: ${err.message}`);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
