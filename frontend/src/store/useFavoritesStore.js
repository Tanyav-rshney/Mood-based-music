import { create } from 'zustand';

// Load persisted favorites from localStorage
const loadFavorites = () => {
  try {
    const stored = localStorage.getItem('neonpulse_favorites');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveFavorites = (favorites) => {
  try {
    localStorage.setItem('neonpulse_favorites', JSON.stringify(favorites));
  } catch {
    // Storage full or unavailable
  }
};

const useFavoritesStore = create((set, get) => ({
  favorites: loadFavorites(),
  sortBy: 'recent', // 'recent' | 'title' | 'artist'

  toggleFavorite: (track) => {
    const { favorites } = get();
    const isFav = favorites.find((t) => t.id === track.id);

    let updated;
    if (isFav) {
      updated = favorites.filter((t) => t.id !== track.id);
    } else {
      updated = [...favorites, { ...track, favoritedAt: Date.now() }];
    }

    saveFavorites(updated);
    set({ favorites: updated });
    return !isFav; // returns true if added, false if removed
  },

  isFavorite: (trackId) => {
    return get().favorites.some((t) => t.id === trackId);
  },

  setSortBy: (sortBy) => set({ sortBy }),

  getSortedFavorites: () => {
    const { favorites, sortBy } = get();
    const sorted = [...favorites];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'artist':
        return sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      case 'recent':
      default:
        return sorted.sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0));
    }
  },

  clearAll: () => {
    saveFavorites([]);
    set({ favorites: [] });
  },
}));

export default useFavoritesStore;
