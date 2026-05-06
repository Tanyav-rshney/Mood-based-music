import { create } from 'zustand';
import { dashboardAPI } from '../services/api';

// Load recently played from localStorage
const loadRecentlyPlayed = () => {
  try {
    const stored = localStorage.getItem('neonpulse_recently_played');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentlyPlayed = (tracks) => {
  try {
    localStorage.setItem('neonpulse_recently_played', JSON.stringify(tracks.slice(0, 20)));
  } catch {}
};

const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  playlist: [],
  volume: 0.8,
  progress: 0,
  shuffle: false,
  repeat: 'off', // 'off' | 'one' | 'all'
  recentlyPlayed: loadRecentlyPlayed(),
  queueVisible: false,
  detectedMood: null,       // The mood detected by ML
  detectedEmoji: null,      // Emoji for detected mood
  detectedConfidence: null,  // Confidence %

  // Actions — always fetches real Hindi Bollywood audio from JioSaavn before playing
  playTrack: async (track, newPlaylist = null) => {
    // ★ Fetch REAL Hindi Bollywood audio from JioSaavn if URL is placeholder ★
    const isPlaceholder = !track.audioUrl || 
      track.audioUrl.includes('soundhelix.com') || 
      (!track.audioUrl.includes('saavncdn.com') && !track.audioUrl.includes('jiosaavn.com'));
    
    if (isPlaceholder && track.title) {
      try {
        const q = `${track.title} ${track.artist || ''}`.trim();
        const res = await fetch(`/api/jiosaavn/search?q=${encodeURIComponent(q)}&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0 && data.results[0].audioUrl) {
          track = {
            ...track,
            audioUrl: data.results[0].audioUrl,
            image: data.results[0].image || track.image,
            duration: data.results[0].duration || track.duration,
          };
        }
      } catch (e) {
        console.log('JioSaavn fetch failed, using existing URL:', e.message);
      }
    }

    const { recentlyPlayed } = get();
    // Add to recently played (dedup, keep last 20)
    const updated = [track, ...recentlyPlayed.filter((t) => t.id !== track.id)].slice(0, 20);
    saveRecentlyPlayed(updated);

    set({
      currentTrack: track,
      isPlaying: true,
      recentlyPlayed: updated,
      progress: 0,
      ...(newPlaylist ? { playlist: newPlaylist } : {}),
    });

    // Fire-and-forget: track the listen event on the backend
    const token = localStorage.getItem('neonpulse_token');
    if (token) {
      dashboardAPI.trackListen({
        songId: track.id || null,
        songTitle: track.title,
        songArtist: track.artist,
        songMood: track.mood || 'chilled',
        duration: track.duration || 240,
      }).catch(() => {}); // silently ignore errors
    }
  },

  // Set playlist + auto-play first song + store mood info
  setPlaylistAndPlay: (songs, moodInfo = {}) => {
    if (!songs || songs.length === 0) return;
    
    set({
      playlist: songs,
      detectedMood: moodInfo.mood || null,
      detectedEmoji: moodInfo.emoji || null,
      detectedConfidence: moodInfo.confidence || null,
    });

    // Play first song
    get().playTrack(songs[0]);
  },

  togglePlay: () => {
    const { currentTrack, isPlaying } = get();
    if (currentTrack) {
      set({ isPlaying: !isPlaying });
    }
  },

  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  toggleQueue: () => set((s) => ({ queueVisible: !s.queueVisible })),
  setQueueVisible: (visible) => set({ queueVisible: visible }),

  removeFromPlaylist: (index) => {
    const { playlist, currentTrack } = get();
    const newPlaylist = [...playlist];
    const removed = newPlaylist.splice(index, 1);
    set({ playlist: newPlaylist });
    
    // If we removed the current track, play next
    if (removed[0]?.id === currentTrack?.id && newPlaylist.length > 0) {
      const nextIndex = Math.min(index, newPlaylist.length - 1);
      get().playTrack(newPlaylist[nextIndex]);
    }
  },

  clearPlaylist: () => {
    set({ playlist: [], detectedMood: null, detectedEmoji: null, detectedConfidence: null });
  },

  cycleRepeat: () => {
    const modes = ['off', 'one', 'all'];
    const { repeat } = get();
    const nextIndex = (modes.indexOf(repeat) + 1) % modes.length;
    set({ repeat: modes[nextIndex] });
  },

  nextTrack: () => {
    const { currentTrack, playlist, shuffle, repeat } = get();
    if (!currentTrack || playlist.length === 0) return;

    if (repeat === 'one') {
      set({ progress: 0 });
      return;
    }

    let nextIndex;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);

    if (shuffle) {
      // Pick random different track
      let rand;
      do {
        rand = Math.floor(Math.random() * playlist.length);
      } while (rand === currentIndex && playlist.length > 1);
      nextIndex = rand;
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= playlist.length) {
        if (repeat === 'all') {
          nextIndex = 0;
        } else {
          set({ isPlaying: false });
          return;
        }
      }
    }

    const nextTrack = playlist[nextIndex];
    get().playTrack(nextTrack);
  },

  prevTrack: () => {
    const { currentTrack, playlist, progress } = get();
    if (!currentTrack || playlist.length === 0) return;

    // If progress is > 3 seconds, just restart song
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex > 0) {
      get().playTrack(playlist[currentIndex - 1]);
    } else {
      get().playTrack(playlist[playlist.length - 1]);
    }
  },
}));

export default usePlayerStore;
