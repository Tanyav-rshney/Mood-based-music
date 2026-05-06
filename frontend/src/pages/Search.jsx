import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdSearch, MdClear, MdMusicNote, MdHistory, MdClose } from 'react-icons/md';
import TrackCard from '../components/Cards/TrackCard';
import SkeletonLoader from '../components/UI/SkeletonLoader';
import API, { getMLRecommendations } from '../services/api';
import useUIStore from '../store/useUIStore';

const moodCategories = [
  { id: 'happy', emoji: '😊', label: 'Happy', color: 'from-yellow-500/30 to-amber-600/10', border: 'border-yellow-500/30' },
  { id: 'sad', emoji: '😢', label: 'Sad', color: 'from-blue-500/30 to-blue-600/10', border: 'border-blue-500/30' },
  { id: 'romantic', emoji: '💕', label: 'Romantic', color: 'from-pink-500/30 to-rose-600/10', border: 'border-pink-500/30' },
  { id: 'energetic', emoji: '🔥', label: 'Energetic', color: 'from-orange-500/30 to-red-600/10', border: 'border-orange-500/30' },
  { id: 'calm', emoji: '🧘', label: 'Calm', color: 'from-green-500/30 to-emerald-600/10', border: 'border-green-500/30' },
  { id: 'chilled', emoji: '🌊', label: 'Chilled', color: 'from-cyan-500/30 to-sky-600/10', border: 'border-cyan-500/30' },
  { id: 'hyper', emoji: '⚡', label: 'Hyper', color: 'from-amber-500/30 to-orange-600/10', border: 'border-amber-500/30' },
  { id: 'melancholy', emoji: '🌙', label: 'Melancholy', color: 'from-purple-500/30 to-violet-600/10', border: 'border-purple-500/30' },
  { id: 'focus', emoji: '🎯', label: 'Focus', color: 'from-teal-500/30 to-teal-600/10', border: 'border-teal-500/30' },
];

const genreFilters = ['All', 'Bollywood', 'Sufi', 'Punjabi', 'Classical', 'Romantic', 'Hip-Hop', 'Retro', 'Fusion'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 250, damping: 25 } },
};

// Load/save recent searches
const loadRecentSearches = () => {
  try {
    return JSON.parse(localStorage.getItem('neonpulse_recent_searches') || '[]');
  } catch { return []; }
};
const saveRecentSearches = (searches) => {
  try {
    localStorage.setItem('neonpulse_recent_searches', JSON.stringify(searches.slice(0, 8)));
  } catch {}
};

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [moodResults, setMoodResults] = useState([]);
  const [moodLoading, setMoodLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches());
  const { voiceQuery, setVoiceQuery } = useUIStore();

  // Consume voice query if present
  useEffect(() => {
    if (voiceQuery) {
      setQuery(voiceQuery);
      setVoiceQuery('');
    }
  }, [voiceQuery, setVoiceQuery]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      setSelectedMood(null);
      try {
        const queryText = query.trim();
        
        const [standardRes, mlRes] = await Promise.allSettled([
          API.get(`/api/songs?search=${encodeURIComponent(queryText)}&limit=30`),
          getMLRecommendations(queryText, 15)
        ]);

        let combinedSongs = [];
        const seenIds = new Set();

        if (standardRes.status === 'fulfilled' && standardRes.value.data) {
          const songs = standardRes.value.data?.data?.songs || [];
          songs.forEach(s => {
            const id = s._id || s.id;
            if (!seenIds.has(id)) {
              seenIds.add(id);
              combinedSongs.push({ ...s, id });
            }
          });
        }

        if (mlRes.status === 'fulfilled' && mlRes.value && mlRes.value.recommendations) {
          const mlSongs = mlRes.value.recommendations;
          mlSongs.forEach(s => {
            const id = s._id || s.id;
            const isDuplicate = combinedSongs.some(existing => 
              existing.id === id || 
              (existing.title === s.title && existing.artist === s.artist)
            );
            if (!isDuplicate) {
              combinedSongs.push({ ...s, id });
            }
          });
        }

        setResults(combinedSongs);
        
        // Save to recent searches
        const updated = [queryText, ...recentSearches.filter(q => q !== queryText)].slice(0, 8);
        setRecentSearches(updated);
        saveRecentSearches(updated);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Browse by mood
  const handleMoodClick = useCallback(async (moodId) => {
    if (selectedMood === moodId) {
      setSelectedMood(null);
      setMoodResults([]);
      return;
    }
    setSelectedMood(moodId);
    setSelectedGenre('All');
    setQuery('');
    setResults([]);
    setSearched(false);
    setMoodLoading(true);
    try {
      const res = await API.get(`/api/songs?mood=${moodId}&limit=30&sort=popularity&order=desc`);
      const songs = res.data?.data?.songs || [];
      setMoodResults(songs.map((s) => ({ ...s, id: s._id || s.id })));
    } catch (err) {
      console.error('Mood browse error:', err);
      setMoodResults([]);
    } finally {
      setMoodLoading(false);
    }
  }, [selectedMood]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const handleRecentSearchClick = (q) => {
    setQuery(q);
  };

  const displayResults = searched ? results : selectedMood ? moodResults : [];
  const isLoading = loading || moodLoading;

  // Filter by genre
  const filteredResults = selectedGenre === 'All' 
    ? displayResults 
    : displayResults.filter(t => t.genres?.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase())));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mx-auto w-[92%] max-w-7xl pt-8 pb-20 min-h-screen"
    >
      {/* Search Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl sm:text-5xl font-display font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-textMuted"
        >
          Discover
        </motion.h1>

        {/* Search Bar */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative max-w-2xl"
        >
          <MdSearch className="absolute left-5 top-1/2 transform -translate-y-1/2 text-textMuted text-2xl" />
          <input
            id="search-input"
            type="text"
            placeholder="Search songs, artists, genres..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-12 text-base text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:bg-white/8 transition-all backdrop-blur-lg"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-white transition-colors p-1"
            >
              <MdClear className="text-xl" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Recent Searches */}
      {!searched && !selectedMood && recentSearches.length > 0 && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-textMuted flex items-center gap-2">
              <MdHistory className="text-lg" /> Recent Searches
            </h3>
            <button onClick={clearRecentSearches} className="text-xs text-textMuted hover:text-white transition-colors">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((q, i) => (
              <button
                key={i}
                onClick={() => handleRecentSearchClick(q)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-textMuted hover:text-white hover:bg-white/10 transition-all"
              >
                <MdHistory className="text-sm opacity-50" />
                {q}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Browse by Mood */}
      {!searched && (
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-display font-bold mb-4 text-white/90">Browse by Mood</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {moodCategories.map((mood) => (
              <motion.button
                key={mood.id}
                onClick={() => handleMoodClick(mood.id)}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border backdrop-blur-lg transition-all duration-300 ${
                  selectedMood === mood.id
                    ? `bg-gradient-to-br ${mood.color} ${mood.border} shadow-lg ring-1 ring-white/20`
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-xl">{mood.emoji}</span>
                <span className="text-[10px] font-bold text-textMuted">{mood.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Genre Filter Pills (when results are showing) */}
      {(searched || selectedMood) && displayResults.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar"
        >
          {genreFilters.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedGenre === genre
                  ? 'bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                  : 'bg-white/5 border-white/10 text-textMuted hover:text-white hover:bg-white/10'
              }`}
            >
              {genre}
            </button>
          ))}
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && <SkeletonLoader count={10} />}

      {/* Search Results */}
      {!isLoading && filteredResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <h2 className="text-xl font-display font-bold text-white/90">
              {searched ? `Results for "${query}"` : `${selectedMood?.charAt(0).toUpperCase()}${selectedMood?.slice(1)} Songs`}
            </h2>
            <span className="text-xs text-textMuted">{filteredResults.length} songs</span>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8"
          >
            {filteredResults.map((track) => (
              <motion.div key={track.id} variants={itemVariants} className="will-change-transform">
                <TrackCard track={track} contextPlaylist={filteredResults} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && searched && results.length === 0 && query.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <MdMusicNote className="text-4xl text-textMuted" />
          </div>
          <h3 className="text-xl font-display font-bold text-textMuted mb-2">No results found</h3>
          <p className="text-sm text-textMuted">
            Try searching for a different song or artist
          </p>
        </motion.div>
      )}

      {/* Empty State */}
      {!searched && !selectedMood && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <MdSearch className="text-4xl text-textMuted" />
          </div>
          <h3 className="text-lg font-display font-bold text-textMuted mb-2">Search for songs & artists</h3>
          <p className="text-sm text-textMuted max-w-md">
            Type a song name or artist, or browse by mood to discover Indian music
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Search;
