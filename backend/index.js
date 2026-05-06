const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios'); // For calling Flask ML API
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'neonpulse_super_secret_jwt_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// ═══════════════════════════════════════════════════════════
//  Flask ML API URL (Python server runs on port 5001)
// ═══════════════════════════════════════════════════════════
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// ═══════════════════════════════════════════════════════════
//  In-Memory User Store (works without MongoDB)
// ═══════════════════════════════════════════════════════════
const usersDB = new Map(); // email → { id, name, email, passwordHash, createdAt, ... }
let userIdCounter = 1;

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch { return null; }
}

// Auth middleware for protected routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please login.' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
  // Find user by ID
  for (const [, user] of usersDB) {
    if (user.id === decoded.id) {
      req.user = user;
      return next();
    }
  }
  return res.status(401).json({ success: false, message: 'User not found.' });
}

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════
//  JioSaavn API — Full-Length Hindi Song URLs
//  Free, no auth needed. Returns full song audio + artwork.
// ═══════════════════════════════════════════════════════════
const saavnCache = new Map(); // In-memory cache: "title|artist" → JioSaavn result
const SAAVN_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Search JioSaavn for a Hindi song and return full audio URL + artwork
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {Object|null} { audioUrl, artworkUrl, trackName, artistName, album, duration }
 */
async function searchJioSaavn(title, artist) {
  const cacheKey = `${(title || '').toLowerCase().trim()}|${(artist || '').toLowerCase().trim()}`;
  
  // Check cache first
  const cached = saavnCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < SAAVN_CACHE_TTL)) {
    return cached.data;
  }

  try {
    const searchTerm = `${title} ${artist}`.trim();
    if (!searchTerm || searchTerm.length < 2) return null;
    
    // Use saavn.sumit.co public API — always search with 'hindi bollywood' to get ONLY Bollywood results
    const response = await axios.get('https://saavn.sumit.co/api/search/songs', {
      params: { query: `${searchTerm} hindi bollywood`, limit: 8 },
      timeout: 8000,
    });

    let results = response.data?.data?.results || [];
    if (results.length === 0) return null;

    // ★ STRICT: Only allow Hindi language songs, reject everything else ★
    const hindiResults = results.filter(r => (r.language || '').toLowerCase() === 'hindi');
    if (hindiResults.length === 0) return null; // No Hindi songs found = return nothing
    results = hindiResults;

    // Find best match
    const titleLower = (title || '').toLowerCase();
    const artistLower = (artist || '').toLowerCase();
    
    let bestMatch = results[0];
    for (const r of results) {
      const rTitle = (r.name || '').toLowerCase();
      const rArtists = (r.artists?.primary || []).map(a => a.name.toLowerCase()).join(' ');
      if (rTitle.includes(titleLower) || titleLower.includes(rTitle)) {
        if (rArtists.includes(artistLower) || artistLower.includes(rArtists)) {
          bestMatch = r;
          break;
        }
      }
    }

    // Get highest quality download URL
    const downloads = bestMatch.downloadUrl || [];
    const audioUrl = (downloads.find(d => d.quality === '320kbps') || downloads.find(d => d.quality === '160kbps') || downloads[downloads.length - 1])?.url;
    if (!audioUrl) return null;

    // Get 500x500 artwork
    const images = bestMatch.image || [];
    const artworkUrl = (images.find(i => i.quality === '500x500') || images[images.length - 1])?.url;

    const artistNames = (bestMatch.artists?.primary || []).map(a => a.name).join(', ');

    const result = {
      audioUrl,
      artworkUrl: artworkUrl || null,
      trackName: bestMatch.name || title,
      artistName: artistNames || artist,
      album: bestMatch.album?.name || '',
      duration: parseInt(bestMatch.duration) || 0,
      language: bestMatch.language || 'hindi',
      year: bestMatch.year || '',
      playCount: bestMatch.playCount || 0,
    };

    // Cache it
    saavnCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;

  } catch (err) {
    console.log(`⚠️  JioSaavn search failed for "${title}":`, err.message);
    return null;
  }
}

/**
 * Batch search JioSaavn for multiple songs (with concurrency limit)
 */
async function batchSearchJioSaavn(songs) {
  const BATCH_SIZE = 3; // JioSaavn is slower, use smaller batches
  const results = [];
  
  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batch = songs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(s => searchJioSaavn(s.title, s.artist))
    );
    results.push(...batchResults);
    
    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < songs.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return results;
}

// =============================================
//  Comprehensive Indian Music Library (63 songs)
// =============================================
const allTracks = [
  // ── Energetic / Party ──
  { id: 'track-1', title: 'Chaiyya Chaiyya', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 95, duration: 312 },
  { id: 'track-2', title: 'Chak De India', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Patriotic'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 92, duration: 288 },
  { id: 'track-3', title: 'Malhari', artist: 'Vishal Dadlani', mood: 'energetic', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 90, duration: 245 },
  { id: 'track-4', title: 'Kar Har Maidaan Fateh', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Motivational'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 88, duration: 296 },
  { id: 'track-5', title: 'Zinda', artist: 'Siddharth Mahadevan', mood: 'energetic', genres: ['Bollywood', 'Rock'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 85, duration: 268 },
  { id: 'track-6', title: 'Khalibali', artist: 'Shivam Pathak', mood: 'hyper', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 87, duration: 230 },

  // ── Romantic ──
  { id: 'track-7', title: 'Tum Hi Ho', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 98, duration: 262 },
  { id: 'track-8', title: 'Raabta', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 91, duration: 284 },
  { id: 'track-9', title: 'Tera Ban Jaunga', artist: 'Akhil Sachdeva', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 89, duration: 248 },
  { id: 'track-10', title: 'Hawayein', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 93, duration: 290 },
  { id: 'track-11', title: 'Tere Bina', artist: 'A.R. Rahman', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 86, duration: 318 },
  { id: 'track-12', title: 'Pehla Nasha', artist: 'Udit Narayan', mood: 'romantic', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 94, duration: 302 },

  // ── Sad → Calming/Soothing (songs that heal, make you feel better) ──
  { id: 'track-13', title: 'Tujhe Kitna Chahne Lage', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Soothing'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 97, duration: 240 },
  { id: 'track-14', title: 'Agar Tum Saath Ho', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 96, duration: 340 },
  { id: 'track-15', title: 'Samjhawan', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Soothing'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 90, duration: 280 },
  { id: 'track-16', title: 'Humdard', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 87, duration: 255 },
  { id: 'track-17', title: 'Tera Yaar Hoon Main', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Comforting'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 85, duration: 254 },
  { id: 'track-65', title: 'Moh Moh Ke Dhaage', artist: 'Papon', mood: 'sad', genres: ['Bollywood', 'Soothing'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 83, duration: 295 },
  { id: 'track-66', title: 'Bol Do Na Zara', artist: 'Armaan Malik', mood: 'sad', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 84, duration: 270 },
  { id: 'track-67', title: 'Tum Se Hi', artist: 'Mohit Chauhan', mood: 'sad', genres: ['Bollywood', 'Comforting'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 91, duration: 312 },
  { id: 'track-18', title: 'Kabira', artist: 'Arijit Singh', mood: 'melancholy', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 90, duration: 232 },
  { id: 'track-68', title: 'Kal Ho Naa Ho', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 96, duration: 322 },
  { id: 'track-69', title: 'Abhi Mujh Mein Kahin', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Comforting'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 94, duration: 298 },

  // ── Calm / Chilled ──
  { id: 'track-19', title: 'Kun Faya Kun', artist: 'A.R. Rahman', mood: 'calm', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 96, duration: 468 },
  { id: 'track-20', title: 'Tujhe Kitna Chahne Lage', artist: 'Arijit Singh', mood: 'calm', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 92, duration: 240 },
  { id: 'track-21', title: 'Ilahi', artist: 'Arijit Singh', mood: 'calm', genres: ['Bollywood', 'Travel'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 87, duration: 218 },
  { id: 'track-22', title: 'Iktara', artist: 'Amitabh Bhattacharya', mood: 'chilled', genres: ['Bollywood', 'Indie'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 86, duration: 232 },
  { id: 'track-23', title: 'Safar', artist: 'Arijit Singh', mood: 'chilled', genres: ['Bollywood', 'Travel'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 84, duration: 266 },
  { id: 'track-24', title: 'Dil Dhadakne Do', artist: 'Priyanka Chopra', mood: 'chilled', genres: ['Bollywood', 'Pop'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 83, duration: 248 },

  // ── Happy ──
  { id: 'track-25', title: 'Gallan Goodiyaan', artist: 'Sukhwinder Singh', mood: 'happy', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 91, duration: 282 },
  { id: 'track-26', title: 'London Thumakda', artist: 'Labh Janjua', mood: 'happy', genres: ['Bollywood', 'Punjabi'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 89, duration: 258 },
  { id: 'track-27', title: 'Balam Pichkari', artist: 'Vishal Dadlani', mood: 'happy', genres: ['Bollywood', 'Holi'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 93, duration: 276 },
  { id: 'track-28', title: 'Badtameez Dil', artist: 'Benny Dayal', mood: 'happy', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 240 },
  { id: 'track-29', title: 'Ainvayi Ainvayi', artist: 'Salim Merchant', mood: 'happy', genres: ['Bollywood', 'Wedding'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 86, duration: 266 },
  { id: 'track-30', title: 'Kala Chashma', artist: 'Badshah', mood: 'happy', genres: ['Bollywood', 'Punjabi'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 94, duration: 234 },

  // ── Focus ──
  { id: 'track-31', title: 'Jashn-E-Bahara', artist: 'Javed Ali', mood: 'focus', genres: ['Bollywood', 'Classical Fusion'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 340 },
  { id: 'track-32', title: 'Ae Dil Hai Mushkil', artist: 'Arijit Singh', mood: 'focus', genres: ['Bollywood', 'Melodic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 95, duration: 278 },
  { id: 'track-33', title: 'Tum Jo Mil Gaye Ho', artist: 'Rafi', mood: 'focus', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 82, duration: 290 },
  { id: 'track-34', title: 'Lag Ja Gale', artist: 'Lata Mangeshkar', mood: 'focus', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 91, duration: 264 },

  // ── Hyper / Party ──
  { id: 'track-35', title: 'Lungi Dance', artist: 'Honey Singh', mood: 'hyper', genres: ['Bollywood', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 88, duration: 252 },
  { id: 'track-36', title: 'Swag Se Swagat', artist: 'Vishal Dadlani', mood: 'hyper', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 244 },
  { id: 'track-37', title: 'Garmi', artist: 'Badshah', mood: 'hyper', genres: ['Bollywood', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 86, duration: 228 },
  { id: 'track-38', title: 'DJ Wale Babu', artist: 'Badshah', mood: 'hyper', genres: ['Punjabi', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 87, duration: 216 },

  // ── Sufi / Spiritual ──
  { id: 'track-39', title: 'Khwaja Mere Khwaja', artist: 'A.R. Rahman', mood: 'calm', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 93, duration: 380 },
  { id: 'track-40', title: 'Afreen Afreen', artist: 'Rahat Fateh Ali Khan', mood: 'calm', genres: ['Ghazal', 'Sufi'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 95, duration: 472 },
  { id: 'track-41', title: 'Bol Na Halke Halke', artist: 'Rahat Fateh Ali Khan', mood: 'romantic', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 88, duration: 296 },

  // ── Punjabi ──
  { id: 'track-42', title: 'Brown Munde', artist: 'AP Dhillon', mood: 'energetic', genres: ['Punjabi', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 94, duration: 196 },
  { id: 'track-43', title: 'Excuses', artist: 'AP Dhillon', mood: 'chilled', genres: ['Punjabi', 'R&B'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 92, duration: 210 },
  { id: 'track-44', title: 'Lover', artist: 'Diljit Dosanjh', mood: 'romantic', genres: ['Punjabi', 'Pop'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 224 },
  { id: 'track-45', title: 'Pasoori', artist: 'Ali Sethi', mood: 'chilled', genres: ['Coke Studio', 'Fusion'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 97, duration: 258 },

  // ── Retro ──
  { id: 'track-46', title: 'Pal Pal Dil Ke Paas', artist: 'Kishore Kumar', mood: 'romantic', genres: ['Retro', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 90, duration: 290 },
  { id: 'track-47', title: 'Mere Sapno Ki Rani', artist: 'Kishore Kumar', mood: 'happy', genres: ['Retro', 'Classic'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 268 },
  { id: 'track-48', title: 'Dum Maro Dum', artist: 'Asha Bhosle', mood: 'chilled', genres: ['Retro', 'Psychedelic'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 87, duration: 310 },
  { id: 'track-49', title: 'Ek Ladki Ko Dekha', artist: 'Kumar Sanu', mood: 'romantic', genres: ['Retro', 'Romantic'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 92, duration: 302 },
  { id: 'track-50', title: 'Roop Tera Mastana', artist: 'Kishore Kumar', mood: 'romantic', genres: ['Retro', 'Classic'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 86, duration: 276 },

  // ── Modern Hits ──
  { id: 'track-51', title: 'Kesariya', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 99, duration: 268 },
  { id: 'track-52', title: 'Apna Bana Le', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 96, duration: 302 },
  { id: 'track-53', title: 'Naatu Naatu', artist: 'Rahul Sipligunj', mood: 'energetic', genres: ['Telugu', 'Dance'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 98, duration: 242 },
  { id: 'track-54', title: 'Maan Meri Jaan', artist: 'King', mood: 'romantic', genres: ['Indie', 'Pop'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 95, duration: 198 },
  { id: 'track-55', title: 'O Bedardeya', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 93, duration: 286 },
  { id: 'track-56', title: 'Jhoome Jo Pathaan', artist: 'Arijit Singh', mood: 'energetic', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 97, duration: 232 },

  // ── Shreya Ghoshal ──
  { id: 'track-57', title: 'Ghoomar', artist: 'Shreya Ghoshal', mood: 'happy', genres: ['Bollywood', 'Folk'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 89, duration: 266 },
  { id: 'track-58', title: 'Deewani Mastani', artist: 'Shreya Ghoshal', mood: 'romantic', genres: ['Bollywood', 'Classical Fusion'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 92, duration: 314 },
  { id: 'track-59', title: 'Nagada Sang Dhol', artist: 'Shreya Ghoshal', mood: 'energetic', genres: ['Bollywood', 'Garba'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 91, duration: 248 },

  // ── Sonu Nigam / KK ──
  { id: 'track-60', title: 'Kal Ho Naa Ho', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 96, duration: 322 },
  { id: 'track-61', title: 'Yaaron', artist: 'KK', mood: 'happy', genres: ['Bollywood', 'Friendship'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 90, duration: 278 },
  { id: 'track-62', title: 'Tadap Tadap', artist: 'KK', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 88, duration: 340 },
  { id: 'track-63', title: 'Abhi Mujh Mein Kahin', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 94, duration: 298 },
];

// =============================================
//  ROUTES
// =============================================

// Health route
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'NeonPulse Backend API is running 🚀',
    totalSongs: allTracks.length,
  });
});

// Spotify Status
app.get('/api/spotify/status', (req, res) => {
  res.json({
    configured: true,
    available: false,
    message: 'Using NeonPulse internal library with 63 curated Indian songs.'
  });
});

// Recommendations endpoint — filter by mood from the library
app.post('/api/recommendations', (req, res) => {
  const { mood = 'chilled', intensity = 50 } = req.body || {};
  
  // Filter by mood, fallback to random if mood not found
  let results = allTracks.filter(t => t.mood === mood);
  if (results.length === 0) {
    // Return random selection
    results = [...allTracks].sort(() => 0.5 - Math.random()).slice(0, 12);
  }

  // Sort by popularity (higher intensity = more popular songs)
  if (intensity > 60) {
    results.sort((a, b) => b.popularity - a.popularity);
  } else {
    results.sort(() => 0.5 - Math.random());
  }

  const explanation = `Found ${results.length} tracks for "${mood}" mood (intensity: ${intensity}). Powered by NeonPulse local library.`;
  
  setTimeout(() => {
    res.json({
      recommendations: results,
      explanation,
      source: 'neonpulse-local'
    });
  }, 500);
});

// Songs endpoint — browse, search, filter
app.get('/api/songs', (req, res) => {
  const { search, mood, genre, sort = 'popularity', order = 'desc', limit = 30, page = 1 } = req.query;
  
  let filtered = [...allTracks];

  // Search by title or artist
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.artist.toLowerCase().includes(q) ||
      t.genres.some(g => g.toLowerCase().includes(q))
    );
  }

  // Filter by mood
  if (mood) {
    filtered = filtered.filter(t => t.mood === mood);
  }

  // Filter by genre
  if (genre) {
    const g = genre.toLowerCase();
    filtered = filtered.filter(t => t.genres.some(tg => tg.toLowerCase().includes(g)));
  }

  // Sort
  if (sort === 'popularity') {
    filtered.sort((a, b) => order === 'desc' ? b.popularity - a.popularity : a.popularity - b.popularity);
  } else if (sort === 'title') {
    filtered.sort((a, b) => order === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title));
  } else if (sort === 'duration') {
    filtered.sort((a, b) => order === 'desc' ? b.duration - a.duration : a.duration - b.duration);
  }

  // Paginate
  const lim = parseInt(limit) || 30;
  const pg = parseInt(page) || 1;
  const startIndex = (pg - 1) * lim;
  const paginated = filtered.slice(startIndex, startIndex + lim);

  res.json({
    data: {
      songs: paginated,
      total: filtered.length,
      page: pg,
      pages: Math.ceil(filtered.length / lim),
    },
  });
});

// ═══════════════════════════════════════════════════════════
//  ML API INTEGRATION ROUTES
//  These routes call the Flask ML API (Python) and return
//  results to the frontend. If Flask is down, they fall back
//  to the local allTracks library.
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/getMusic
 * Main endpoint: Frontend sends mood/text → Node.js → Flask ML API → Response
 * 
 * Body: { "mood": "happy" } or { "text": "I feel so energetic today" }
 * Optional: { "count": 15 }
 * 
 * Returns: { recommendations: [...], detected_mood, confidence, source }
 */
app.post('/api/getMusic', async (req, res) => {
  const { mood, text, count = 10 } = req.body;

  try {
    // ── Step 1: Call Flask ML API ──
    const mlResponse = await axios.post(`${ML_API_URL}/recommend`, {
      mood: mood || '',
      text: text || '',
      count: count,
    }, { timeout: 10000 });

    const mlData = mlResponse.data;
    const mlSongs = mlData.songs || [];

    // ── Step 2: Fetch real Hindi audio from JioSaavn for each song ──
    console.log(`🎵 Fetching JioSaavn audio for ${mlSongs.length} songs...`);
    const saavnResults = await batchSearchJioSaavn(
      mlSongs.map(s => ({ title: s.title || '', artist: s.artist || '' }))
    );

    // ── Step 3: Enrich ML songs with real Hindi audio + artwork ──
    const enrichedSongs = mlSongs.map((song, i) => {
      const saavn = saavnResults[i];
      const localMatch = allTracks[i % allTracks.length];

      return {
        id: `ml-${i}-${Date.now()}`,
        title: saavn?.trackName || song.title || 'Unknown',
        artist: saavn?.artistName || song.artist || 'Unknown',
        mood: song.mood || mlData.detected_mood,
        genres: song.genres || localMatch.genres || [],
        popularity: song.popularity || localMatch.popularity || 80,
        duration: saavn?.duration || song.duration || 240,
        valence: song.valence,
        energy: song.energy,
        danceability: song.danceability,
        album: saavn?.album || song.album || '',
        // ★ REAL full-length audio from JioSaavn ★
        audioUrl: saavn?.audioUrl || localMatch.audioUrl,
        // ★ REAL album artwork from JioSaavn ★
        image: saavn?.artworkUrl || localMatch.image,
        isPreview: false, // JioSaavn gives full songs
        saavnMatch: !!saavn?.audioUrl,
      };
    });

    const realCount = enrichedSongs.filter(s => s.saavnMatch).length;
    console.log(`✅ JioSaavn: ${realCount}/${enrichedSongs.length} songs matched with real Hindi audio`);

    // ── Step 4: Send response ──
    res.json({
      recommendations: enrichedSongs,
      detected_mood: mlData.detected_mood,
      dataset_mood: mlData.dataset_mood,
      emoji: mlData.emoji,
      confidence: mlData.confidence,
      keywords: mlData.keywords || [],
      explanation: `🤖 ML detected "${mlData.detected_mood}" mood (${mlData.confidence}% confidence). ${realCount}/${enrichedSongs.length} songs with real Hindi audio.`,
      source: 'ml-model',
      total_results: enrichedSongs.length,
    });

  } catch (error) {
    // ── Flask is down → Fall back to local library with JioSaavn ──
    console.log('⚠️  ML API unavailable, using local fallback:', error.message);

    let fallbackMood = mood;
    if (!fallbackMood && text) {
      try {
        const { classifyMood } = require('./src/services/moodService');
        fallbackMood = classifyMood(text).mood;
      } catch { fallbackMood = 'energetic'; }
    }
    fallbackMood = fallbackMood || 'energetic';

    let results = allTracks.filter(t => t.mood === fallbackMood);
    if (results.length === 0) {
      results = [...allTracks].sort(() => 0.5 - Math.random()).slice(0, count);
    }
    results = results.slice(0, count);

    // Try to get real Hindi audio for fallback songs too
    try {
      const saavnResults = await batchSearchJioSaavn(
        results.map(s => ({ title: s.title, artist: s.artist }))
      );
      results = results.map((song, i) => {
        const saavn = saavnResults[i];
        return {
          ...song,
          audioUrl: saavn?.audioUrl || song.audioUrl,
          image: saavn?.artworkUrl || song.image,
          isPreview: false,
          duration: saavn?.duration || song.duration,
        };
      });
    } catch {} // If JioSaavn fails, keep original URLs

    res.json({
      recommendations: results,
      detected_mood: fallbackMood,
      emoji: { happy: '😊', sad: '😢', angry: '😠', calm: '😌', energetic: '⚡', romantic: '💕', hyper: '🤩', chilled: '🌊', focus: '🎯', melancholy: '🌙' }[fallbackMood] || '🎵',
      confidence: 100,
      keywords: [fallbackMood],
      explanation: `📦 ML API is offline. Showing ${results.length} tracks for "${fallbackMood}" from local library.`,
      source: 'local-fallback',
      total_results: results.length,
    });
  }
});

/**
 * POST /api/ml/recommend
 * Direct proxy to Flask ML API (for advanced usage)
 */
app.post('/api/ml/recommend', async (req, res) => {
  try {
    const response = await axios.post(`${ML_API_URL}/recommend`, req.body, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      error: 'ML API is not available',
      message: 'Please start the Flask ML server: cd ml-model && python ml_api.py',
      fallback: 'Use /api/recommendations for local library results',
    });
  }
});

/**
 * GET /api/ml/moods
 * Get list of moods the ML model supports
 */
app.get('/api/ml/moods', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/moods`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    // Fallback moods
    res.json({
      moods: [
        { id: 'happy', emoji: '😊', dataset_mood: 'happy' },
        { id: 'sad', emoji: '😢', dataset_mood: 'sad' },
        { id: 'angry', emoji: '😠', dataset_mood: 'angry' },
        { id: 'calm', emoji: '😌', dataset_mood: 'calm' },
        { id: 'energetic', emoji: '⚡', dataset_mood: 'energetic' },
        { id: 'romantic', emoji: '💕', dataset_mood: 'happy' },
        { id: 'excited', emoji: '🤩', dataset_mood: 'energetic' },
        { id: 'anxious', emoji: '😰', dataset_mood: 'calm' },
      ],
      source: 'local-fallback',
    });
  }
});

/**
 * GET /api/ml/status
 * Check if the Flask ML API is running
 */
app.get('/api/ml/status', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/`, { timeout: 3000 });
    res.json({
      ml_api_available: true,
      ml_api_url: ML_API_URL,
      ...response.data,
    });
  } catch (error) {
    res.json({
      ml_api_available: false,
      ml_api_url: ML_API_URL,
      message: 'Flask ML API is not running. Start it with: cd ml-model && python ml_api.py',
      local_library: `${allTracks.length} songs available as fallback`,
    });
  }
});

// ═══════════════════════════════════════════════════════════
//  JioSaavn Search Route (for frontend direct use)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/jiosaavn/search?q=song+artist&limit=5
 * Search JioSaavn directly for Hindi songs
 */
app.get('/api/jiosaavn/search', async (req, res) => {
  const { q, limit = 5 } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ results: [], message: 'Query too short' });
  }

  try {
    // ★ Always search with 'hindi bollywood' to get only Bollywood results ★
    const searchQuery = `${q.trim()} hindi bollywood`;
    const response = await axios.get('https://saavn.sumit.co/api/search/songs', {
      params: { query: searchQuery, limit: Math.min(parseInt(limit) || 5, 20) },
      timeout: 8000,
    });

    // ★ STRICT: Filter to ONLY Hindi language songs ★
    const allResults = response.data?.data?.results || [];
    const hindiOnly = allResults.filter(r => (r.language || '').toLowerCase() === 'hindi');
    const finalResults = hindiOnly; // Only Hindi, no fallback to English

    const results = finalResults.map(r => {
      const downloads = r.downloadUrl || [];
      const audioUrl = (downloads.find(d => d.quality === '320kbps') || downloads.find(d => d.quality === '160kbps') || downloads[downloads.length - 1])?.url || '';
      const images = r.image || [];
      const image = (images.find(i => i.quality === '500x500') || images[images.length - 1])?.url || null;
      const artistNames = (r.artists?.primary || []).map(a => a.name).join(', ');
      return {
        title: r.name,
        artist: artistNames,
        album: r.album?.name || '',
        audioUrl,
        image,
        duration: parseInt(r.duration) || 0,
        language: r.language || 'hindi',
        year: r.year,
        isPreview: false,
      };
    });

    res.json({ results, total: results.length });
  } catch (error) {
    res.json({ results: [], error: 'JioSaavn search failed' });
  }
});

// Keep iTunes route for backward compat
app.get('/api/itunes/search', async (req, res) => {
  // Redirect to JioSaavn
  const { q, limit } = req.query;
  try {
    const response = await axios.get(`http://localhost:${PORT}/api/jiosaavn/search`, { params: { q, limit } });
    res.json(response.data);
  } catch {
    res.json({ results: [] });
  }
});

// ═══════════════════════════════════════════════════════════
//  AUTH ROUTES (In-Memory — no MongoDB required)
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'Password must be at least 6 characters' });
    }
    if (usersDB.has(email.toLowerCase())) {
      return res.status(400).json({ success: false, statusCode: 400, message: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `user_${userIdCounter++}`;
    const user = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      avatar: '',
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      moodHistory: [],
      listeningHistory: [],
      favorites: [],
      totalListeningTime: 0,
    };

    usersDB.set(user.email, user);

    const token = generateToken(userId);

    console.log(`👤 New user registered: ${email}`);

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Registration successful',
      data: {
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = usersDB.get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLogin = new Date().toISOString();
    const token = generateToken(user.id);

    console.log(`🔑 User logged in: ${email}`);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires token)
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    statusCode: 200,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        memberSince: user.createdAt,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        moodHistoryCount: user.moodHistory.length,
        listeningHistoryCount: user.listeningHistory.length,
        favoritesCount: user.favorites.length,
      },
    },
  });
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { name, avatar } = req.body;
  const user = req.user;
  if (name) user.name = name;
  if (avatar) user.avatar = avatar;
  res.json({
    success: true,
    data: { user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } },
  });
});

/**
 * POST /api/auth/forgot-password
 */
app.post('/api/auth/forgot-password', (req, res) => {
  res.json({ success: true, data: { message: 'Password reset not available in demo mode' } });
});

/**
 * POST /api/auth/reset-password/:token
 */
app.post('/api/auth/reset-password/:token', (req, res) => {
  res.json({ success: true, data: { message: 'Password reset not available in demo mode' } });
});

/**
 * POST /api/auth/change-password
 */
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user;
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  const token = generateToken(user.id);
  res.json({ success: true, data: { token }, message: 'Password changed successfully' });
});

// ═══════════════════════════════════════════════════════════
//  DASHBOARD ROUTES (In-Memory)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/dashboard
 * Get user dashboard stats
 */
app.get('/api/dashboard', authMiddleware, (req, res) => {
  const user = req.user;

  // Calculate stats
  const totalSongsPlayed = user.listeningHistory.length;
  const uniqueMoods = [...new Set(user.moodHistory.map(m => m.mood))];
  const totalSeconds = user.totalListeningTime || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  // Mood analytics
  const moodCounts = {};
  user.moodHistory.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1; });
  const totalMoodEntries = user.moodHistory.length || 1;
  const moodAnalytics = Object.entries(moodCounts)
    .map(([mood, count]) => ({ mood, count, percentage: Math.round((count / totalMoodEntries) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Top artists
  const artistCounts = {};
  user.listeningHistory.forEach(h => {
    if (h.songArtist) artistCounts[h.songArtist] = (artistCounts[h.songArtist] || 0) + 1;
  });
  const topArtists = Object.entries(artistCounts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Favorite mood
  const favoriteMood = moodAnalytics.length > 0 ? moodAnalytics[0].mood : null;

  // Last 7 days daily listening
  const dailyListening = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayEntries = user.listeningHistory.filter(h => h.listenedAt && h.listenedAt.startsWith(dayStr));
    const mins = dayEntries.reduce((sum, h) => sum + Math.round((h.duration || 0) / 60), 0);
    dailyListening.push({ day: dayNames[d.getDay()], date: dayStr, minutesListened: mins });
  }

  res.json({
    success: true,
    data: {
      user: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt,
      },
      stats: {
        totalSongsPlayed,
        totalMoodsExplored: uniqueMoods.length,
        favoritesCount: user.favorites.length,
        favoriteMood,
        totalListeningTime: { seconds: totalSeconds, formatted: `${hours}h ${minutes}m` },
      },
      moodAnalytics,
      topArtists,
      recentHistory: user.listeningHistory.slice(-30).reverse(),
      moodTimeline: user.moodHistory.slice(-15).reverse(),
      dailyListening,
      favorites: [],
    },
  });
});

/**
 * POST /api/dashboard/listen — Track a listened song
 */
app.post('/api/dashboard/listen', authMiddleware, (req, res) => {
  const user = req.user;
  const { songTitle, songArtist, songMood, duration } = req.body;
  user.listeningHistory.push({
    songTitle: songTitle || 'Unknown',
    songArtist: songArtist || 'Unknown',
    songMood: songMood || 'chilled',
    duration: duration || 0,
    listenedAt: new Date().toISOString(),
  });
  user.totalListeningTime += (duration || 0);
  if (user.listeningHistory.length > 500) user.listeningHistory = user.listeningHistory.slice(-500);
  res.json({ success: true, message: 'Listen tracked' });
});

/**
 * POST /api/dashboard/mood — Track a mood selection
 */
app.post('/api/dashboard/mood', authMiddleware, (req, res) => {
  const user = req.user;
  const { mood, rawInput } = req.body;
  user.moodHistory.push({ mood: mood || 'chilled', rawInput: rawInput || '', timestamp: new Date().toISOString() });
  if (user.moodHistory.length > 200) user.moodHistory = user.moodHistory.slice(-200);
  res.json({ success: true, message: 'Mood tracked' });
});

/**
 * POST /api/dashboard/favorite — Toggle favorite
 */
app.post('/api/dashboard/favorite', authMiddleware, (req, res) => {
  const user = req.user;
  const { songId } = req.body;
  const idx = user.favorites.indexOf(songId);
  if (idx >= 0) { user.favorites.splice(idx, 1); } else { user.favorites.push(songId); }
  res.json({ success: true, isFavorite: idx < 0, favoritesCount: user.favorites.length });
});

/**
 * GET /api/dashboard/history — Get listening history
 */
app.get('/api/dashboard/history', authMiddleware, (req, res) => {
  const user = req.user;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const history = user.listeningHistory.slice().reverse();
  const paginated = history.slice((page - 1) * limit, page * limit);
  res.json({ success: true, data: { history: paginated, total: history.length, page, pages: Math.ceil(history.length / limit) } });
});

// ═══════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n${'═'.repeat(58)}`);
  console.log(`  🚀 NeonPulse Backend running on http://localhost:${PORT}`);
  console.log(`  📦 ${allTracks.length} songs in local library`);
  console.log(`  🤖 ML API expected at ${ML_API_URL}`);
  console.log(`  🎵 JioSaavn API enabled for full Hindi songs`);
  console.log(`  👤 Auth: In-Memory (no MongoDB needed)`);
  console.log(`  📡 Routes:`);
  console.log(`     POST /api/auth/register      → Register new user`);
  console.log(`     POST /api/auth/login          → Login`);
  console.log(`     GET  /api/auth/me             → User profile`);
  console.log(`     GET  /api/dashboard           → User dashboard`);
  console.log(`     POST /api/getMusic            → ML + JioSaavn real audio`);
  console.log(`     POST /api/recommendations     → Local library`);
  console.log(`     GET  /api/songs               → Browse/search songs`);
  console.log(`     GET  /api/jiosaavn/search      → Direct JioSaavn search`);
  console.log(`     GET  /api/ml/status            → Check ML API status`);
  console.log(`${'═'.repeat(58)}\n`);
});