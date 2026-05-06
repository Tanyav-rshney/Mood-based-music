import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useFavoritesStore from '../store/useFavoritesStore';
import TrackCard from '../components/Cards/TrackCard';
import { MdLibraryMusic, MdSortByAlpha, MdAccessTime, MdPerson, MdDeleteSweep } from 'react-icons/md';
import useToastStore from '../store/useToastStore';

const sortOptions = [
  { id: 'recent', label: 'Recent', icon: <MdAccessTime /> },
  { id: 'title', label: 'Title', icon: <MdSortByAlpha /> },
  { id: 'artist', label: 'Artist', icon: <MdPerson /> },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 250, damping: 25 } },
};

const Favorites = () => {
  const { favorites, sortBy, setSortBy, getSortedFavorites, clearAll } = useFavoritesStore();
  const { addToast } = useToastStore();
  const sorted = getSortedFavorites();

  const handleClearAll = () => {
    if (favorites.length === 0) return;
    clearAll();
    addToast('All favorites cleared', 'info');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-6 md:p-10 max-w-7xl mx-auto min-h-screen"
    >
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,0,127,0.3)]"
          >
             <MdLibraryMusic className="text-4xl text-white" />
          </motion.div>
          <div>
             <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Playlist</p>
             <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight">Your Favorites</h1>
             <p className="text-textMuted mt-1 font-medium text-sm">{favorites.length} {favorites.length === 1 ? 'song' : 'songs'}</p>
          </div>
        </div>

        {/* Sort & Actions */}
        {favorites.length > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            {/* Sort pills */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    sortBy === opt.id
                      ? 'bg-white text-black shadow-sm'
                      : 'text-textMuted hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Clear all */}
            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all hover:scale-105"
              title="Clear all favorites"
            >
              <MdDeleteSweep className="text-lg" />
            </button>
          </div>
        )}
      </div>

      {favorites.length === 0 ? (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-textMuted"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MdLibraryMusic className="text-7xl mb-6 opacity-30" />
          </motion.div>
          <p className="text-lg font-display font-bold">No favorites yet</p>
          <p className="text-sm mt-2 max-w-xs text-center">Go to Home or Search and tap the heart icon on any song to save it here!</p>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8"
        >
          <AnimatePresence>
            {sorted.map(track => (
              <motion.div 
                key={`fav-${track.id}`} 
                variants={itemVariants}
                layout
                className="will-change-transform"
              >
                <TrackCard track={track} contextPlaylist={sorted} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Favorites;
