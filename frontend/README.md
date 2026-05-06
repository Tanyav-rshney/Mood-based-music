# Mood Based Music Recommendation System

This project uses a Node/Express backend and a Vite/React frontend. The backend can call the Spotify Web API when valid credentials are available, and it falls back to local recommendations when Spotify is unavailable.

## Setup

1. In `music_recomendation/backend`, create a `.env` file from `.env.example`.
2. Add your own Spotify app credentials:

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
PORT=5000
```

3. Start the backend:

```bash
npm install
npm run dev
```

4. Start the frontend in a second terminal:

```bash
cd ../frontend
npm install
npm run dev
```

## API routes

- `GET /api/health` checks whether the backend is running.
- `GET /api/spotify/status` checks whether Spotify catalog access works.
- `POST /api/recommendations` generates Spotify-backed or local recommendations.

## Notes

- The frontend talks to the backend through the Vite proxy defined in `vite.config.js`.
- If Spotify returns an access error, the app uses the local fallback model instead.
- Never commit real Spotify credentials. Keep them only in your local `.env` file.
