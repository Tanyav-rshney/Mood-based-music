# NeonPulse - Frontend Documentation

## 1. Project Overview
NeonPulse is a Spotify-inspired, premium-level web application designed to deliver an immersive music recommendation experience. It features high-end UI elements including dark mode, glassmorphism, responsive mobile-first navigation, and a robust audio streaming player powered by Howler.js.

## 2. Tech Stack
* **React 19**: Modern functional components, hooks, and Suspense.
* **TailwindCSS**: Utillity-first CSS for rapid UI styling, custom glassmorphism components (`.glass-panel`), and a dark-theme color system.
* **Framer Motion**: Smooth page transitions, variants, and component micro-animations ensuring the UI feels alive.
* **Zustand**: Tiny, scalable, and fast state management. Used extensively for decoupling the Player logic from the UI.
* **Howler.js**: Dependable audio library built on Web Audio API and HTML5 Audio. Deals with streaming gracefully and manages caching.
* **React Router v7**: Declarative routing for navigation.
* **React Icons**: Scalable vector icons standardizing the iconography.
* **Axios**: Promised-based HTTP client for our backend recommendation endpoints.

## 3. Folder Structure Explanation

`src/` holds all scalable front-end architecture:
* `/animations`: (Optional) Holds framer-motion variants and reusable animated wrappers.
* `/assets`: Images, graphics, and static files.
* `/components/Cards`: Granular container displays. E.g., `TrackCard`.
* `/components/Layout`: Major structural blocks. E.g., `Sidebar`, `Topbar`, `MainLayout`, `MobileNav`.
* `/components/Player`: Logic and UI for music playback like `PlayerBar`.
* `/pages`: Top-level route views. E.g., `Home`, `Search`, `Favorites`.
* `/services`: Reusable API caller configurations. E.g., `api.js`.
* `/store`: Zustand global state slices. E.g., `usePlayerStore.js`.
* `/styles`: Global specific CSS via Tailwind injections. E.g., `index.css`.
* `/utils`: Helpers and constants. E.g., `constants.js`.

## 4. Component Breakdown
* **MainLayout**: Houses the grid structure. It persists the `Sidebar` and `PlayerBar` so music isn't interrupted upon navigation.
* **PlayerBar**: Integrates directly with Howler and Zustand. Controls playback, progression, and volume logic.
* **TrackCard**: A highly interactive UI card. Shows track metadata, genres, cover art, and manages its own unique play state indicator (a bounce animation syncing with active tracks).
* **Home**: The discovery engine UI. Manages sliders for discovery configuration, mood selection, and icons.

## 5. State Management Flow
**Zustand** is utilized to build isolated state stores.
* `usePlayerStore`: Holds `isPlaying`, `progress`, `volume`, `playlist`, and `currentTrack`. The `PlayerBar` listens to these variables to play/pause Howler. The `TrackCard` triggers functions like `playTrack(track)`. Since it is global, playing a track anywhere inside the app reflects directly onto the persistent `PlayerBar`.
* `useFavoritesStore`: Manages a list of liked tracks.

## 6. Animation System
The app thrives on micro-interactions.
1. **Framer Motion**: Used on entire page wrappers (`<motion.div>`) allowing fade and slide transitions between routes.
2. **Tailwind Transitions**: Heavily applied to hover states. Cards scale up `scale-105` and active buttons scale down `active:scale-95`.
3. **Keyframes**: Inside `index.css`/Tailwind config, custom animations for the active playing bounds.

## 7. API Integration
The `/api/recommendations` endpoint is called via Axios (`src/services/api.js`).
If the backend does not respond or lacks audio payloads, an intelligent fallback dataset containing high-quality Creative Commons MP3 tracks kicks in. This ensures the frontend doesn't break due to missing API implementations.

## 8. How to Run Project
1. Open a terminal and navigate to this `frontend` directory.
2. Run `npm install` to install all required dependencies including Tailwind.
3. Run `npm run dev` to start the Vite development server.
4. Navigate to `http://localhost:5173`.

## 9. Future Improvements
* Add Spotify OAuth allowing users to query actual Spotify track resources.
* Implement a globally synced user profile to the backend.
* Create a dedicated `/artist/:id` specific view to delve deeper into discographies.
* Include actual audio spectrum analysis for the `PlayerBar` using Howler Web Audio API features.
