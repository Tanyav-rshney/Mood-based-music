# 🎵 NeonPulse Music Backend - Complete Documentation

## Mood-Based Music Recommendation System

A production-ready Node.js + Express + MongoDB backend that recommends songs based on user mood using NLP keyword classification and sentiment analysis.

---

## 📁 Folder Structure

```
backend/
├── .env                          # Environment variables (DO NOT commit)
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies & scripts
├── index.js                      # Legacy entry (kept for reference)
│
└── src/
    ├── server.js                 # 🚀 Main application entry point
    │
    ├── config/
    │   ├── db.js                 # MongoDB connection with Mongoose
    │   ├── logger.js             # Winston logging system
    │   └── cache.js              # In-memory caching (node-cache)
    │
    ├── models/
    │   ├── Song.js               # Song schema (title, artist, mood, audioFeatures)
    │   └── User.js               # User schema (name, email, moodHistory, preferences)
    │
    ├── services/
    │   ├── moodService.js        # 🧠 NLP mood classification engine
    │   └── recommendationService.js  # 🎵 Recommendation algorithm
    │
    ├── controllers/
    │   ├── moodController.js     # Mood API handlers
    │   ├── songController.js     # Song CRUD handlers
    │   └── recommendationController.js  # Recommendation handlers
    │
    ├── routes/
    │   ├── moodRoutes.js         # POST /api/mood, GET /api/mood/supported
    │   ├── songRoutes.js         # CRUD for /api/songs
    │   └── recommendationRoutes.js  # /api/recommendations, /api/recommend
    │
    ├── middleware/
    │   ├── errorHandler.js       # Global error handling + 404
    │   └── rateLimiter.js        # Rate limiting (100 req/15min)
    │
    └── utils/
        ├── ApiError.js           # Custom error class with HTTP codes
        ├── ApiResponse.js        # Standardized response wrapper
        └── seedDatabase.js       # 📦 Database seeder (54 dummy songs)
```

---

## 📦 Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express.js v5** | Web framework |
| **MongoDB** | NoSQL database |
| **Mongoose v8** | MongoDB ODM |
| **Winston** | Logging system |
| **node-cache** | In-memory caching |
| **express-rate-limit** | API rate limiting |
| **Morgan** | HTTP request logging |
| **dotenv** | Environment variables |
| **Nodemon** | Development auto-restart |
| **CORS** | Cross-origin requests |

---

## 🚀 How to Run

### Prerequisites
- Node.js v18+
- MongoDB running locally OR MongoDB Atlas URI

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment
Edit `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/neonpulse_music
CORS_ORIGIN=http://localhost:5173
```

### Step 3: Seed the Database
```bash
npm run seed
```
This inserts **54 songs** across **9 moods** (6 songs each).

### Step 4: Start the Server
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

### Step 5: Verify
Open http://localhost:5000 in browser — you should see:
```json
{
  "ok": true,
  "message": "NeonPulse Music API is running 🚀",
  "version": "2.0.0"
}
```

---

## 📡 API Documentation

### 1. POST `/api/mood` — Classify Mood from Text

Classifies user's mood from natural text input using NLP.

**Request:**
```json
{
  "text": "I am feeling really sad and lonely today"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mood classified as: sad",
  "data": {
    "mood": "sad",
    "confidence": 1.0,
    "method": "direct",
    "keywords": ["sad"],
    "sentiment": 0
  }
}
```

---

### 2. GET `/api/mood/supported` — List All Moods

**Response:**
```json
{
  "success": true,
  "data": {
    "moods": [
      { "id": "happy", "emoji": "😊", "label": "Happy", "description": "Joyful and upbeat vibes" },
      { "id": "sad", "emoji": "😢", "label": "Sad", "description": "Emotional and somber tracks" },
      { "id": "calm", "emoji": "🧘", "label": "Calm", "description": "Peaceful and serene sounds" },
      ...
    ]
  }
}
```

---

### 3. POST `/api/recommendations` — Get Song Recommendations ⭐ (Frontend uses this)

**Request:**
```json
{
  "mood": "happy",
  "intensity": 80,
  "query": "",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": "69e20199c4e3b5f4cfff981b",
      "title": "Feel Good Inc",
      "artist": "Static Pulse",
      "genres": ["Electronic", "Pop"],
      "image": "https://images.unsplash.com/...",
      "audioUrl": "https://www.soundhelix.com/...",
      "mood": "happy",
      "popularity": 85
    }
  ],
  "explanation": "😊 Found 6 tracks for your \"happy\" mood with high intensity focus.",
  "source": "database",
  "total": 6,
  "page": 1,
  "pages": 1
}
```

---

### 4. GET `/api/recommend/:mood` — REST-style Recommendations

**Example:** `GET /api/recommend/energetic?limit=5&page=1`

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [...],
    "mood": "energetic",
    "total": 6,
    "page": 1,
    "pages": 2
  }
}
```

---

### 5. POST `/api/recommend/smart` — Smart Text-to-Songs

Full pipeline: text → NLP → mood → recommendations

**Request:**
```json
{
  "text": "I want to study and focus on my exams",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "moodAnalysis": {
      "mood": "focus",
      "confidence": 1.0,
      "method": "direct",
      "keywords": ["focus"]
    },
    "recommendations": [...],
    "explanation": "🎯 Found 6 tracks for your \"focus\" mood."
  }
}
```

---

### 6. GET `/api/songs` — List All Songs

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `mood` | string | - | Filter by mood |
| `genre` | string | - | Filter by genre |
| `artist` | string | - | Filter by artist |
| `search` | string | - | Search title/artist |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |
| `sort` | string | createdAt | Sort field |
| `order` | string | desc | Sort order (asc/desc) |

**Example:** `GET /api/songs?mood=energetic&limit=2`

---

### 7. POST `/api/songs` — Add a Song

**Request:**
```json
{
  "title": "New Song",
  "artist": "New Artist",
  "mood": "happy",
  "genre": "Pop",
  "genres": ["Pop", "Dance"],
  "image": "https://...",
  "audioUrl": "https://...",
  "popularity": 80
}
```

---

### 8. POST `/api/songs/bulk` — Bulk Add Songs

**Request:**
```json
{
  "songs": [
    { "title": "Song 1", "artist": "Artist 1", "mood": "happy" },
    { "title": "Song 2", "artist": "Artist 2", "mood": "sad" }
  ]
}
```

---

## 🗄️ Database Schema

### Song Schema
```javascript
{
  title:          String (required, indexed),
  artist:         String (required, indexed),
  genre:          String,
  genres:         [String],
  mood:           String (required, enum, indexed),
  image:          String (URL),
  audioUrl:       String (URL),
  audioFeatures: {
    energy:          Number (0-1),
    valence:         Number (0-1),
    danceability:    Number (0-1),
    tempo:           Number (BPM),
    acousticness:    Number (0-1),
    instrumentalness: Number (0-1)
  },
  popularity:     Number (0-100),
  playCount:      Number,
  createdAt:      Date (auto),
  updatedAt:      Date (auto)
}
```

### User Schema
```javascript
{
  name:           String (required),
  email:          String (unique, required),
  moodHistory:    [{ mood, timestamp, rawInput }],
  preferences: {
    favoriteGenres:  [String],
    favoriteArtists: [String],
    defaultMood:     String
  },
  favorites:      [ObjectId → Song],
  avatar:         String (URL),
  createdAt:      Date (auto),
  updatedAt:      Date (auto)
}
```

---

## 🧠 NLP Mood Classification

### How It Works

1. **Direct Match**: If user types a mood name directly ("happy"), instant match (confidence: 1.0)
2. **Keyword Matching**: Text is scanned against 200+ keywords mapped to 9 moods
3. **Sentiment Analysis**: Word weights (-1.0 to +1.0) determine emotional polarity
4. **Fallback**: Defaults to "chilled" if no match found

### Supported Moods
| Mood | Example Keywords |
|---|---|
| 😊 Happy | happy, joyful, excited, khush, masti |
| 😢 Sad | sad, depressed, heartbroken, udas, rona |
| 🧘 Calm | peaceful, serene, sukoon, shaant |
| 🔥 Energetic | pumped, workout, gym, josh, junoon |
| 💕 Romantic | love, crush, pyaar, ishq, dil |
| 🌙 Melancholy | nostalgic, memories, yaad, bittersweet |
| 🎯 Focus | study, concentrate, padhai, coding |
| ⚡ Hyper | rave, dance, pagal, dhamaal |
| 🌊 Chilled | chill, vibes, laid back, aram |

### Extending with ML (Future)
Replace the `classifyMood()` function in `services/moodService.js` with:
```javascript
// Example: Call a Python ML API
const classifyMood = async (text) => {
  const response = await axios.post('http://localhost:8000/predict', { text });
  return response.data; // { mood, confidence }
};
```

---

## ✨ Advanced Features

| Feature | Implementation |
|---|---|
| **Caching** | node-cache with 5-minute TTL for repeated mood queries |
| **Pagination** | All list endpoints support `page` and `limit` params |
| **Search** | Regex-based title/artist/genre search |
| **Rate Limiting** | 100 requests/15min (read), 30/15min (write) |
| **Error Handling** | Global middleware catches Mongoose + custom errors |
| **Logging** | Winston with colors (dev) + file logging (prod) |
| **Fallback Mode** | Works without MongoDB using hardcoded tracks |

---

## 🔮 Future Scope

### Spotify API Integration
```env
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
```
Use the Spotify Web API to fetch real tracks, audio features, and album art.

### Machine Learning Integration
- Train a mood classifier using TF-IDF + SVM or BERT
- Deploy as a Python microservice (Flask/FastAPI)
- Replace keyword matching with ML predictions

### Authentication
- Add JWT-based auth with bcrypt password hashing
- User registration/login endpoints
- Protected routes for user-specific features

---

## 🎯 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `MONGODB_URI` | mongodb://127.0.0.1:27017/neonpulse_music | MongoDB connection |
| `CORS_ORIGIN` | http://localhost:5173 | Allowed frontend origins |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `CACHE_TTL` | 300 | Cache lifetime in seconds |
