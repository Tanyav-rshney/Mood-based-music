import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdTrendingUp, MdHistory, MdAutoAwesome, MdPerson, MdQueueMusic, MdPlayArrow, MdSend, MdPsychology } from 'react-icons/md';
import { moods } from '../utils/constants';
import { getRecommendations, getTrendingSongs, getForYouSongs, getAllArtists, getMoodPlaylist, dashboardAPI } from '../services/api';
import API from '../services/api';
import TrackCard from '../components/Cards/TrackCard';
import SkeletonLoader from '../components/UI/SkeletonLoader';
import usePlayerStore from '../store/usePlayerStore';
import useToastStore from '../store/useToastStore';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 25 } }
};
const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const moodPlaylistSuggestions = [
  { mood: 'romantic', emoji: '💕', label: 'Romantic Evenings', gradient: 'from-pink-500/30 to-rose-600/10', border: 'border-pink-500/30' },
  { mood: 'energetic', emoji: '🔥', label: 'High Energy', gradient: 'from-orange-500/30 to-red-600/10', border: 'border-orange-500/30' },
  { mood: 'calm', emoji: '🧘', label: 'Inner Peace', gradient: 'from-green-500/30 to-emerald-600/10', border: 'border-green-500/30' },
  { mood: 'sad', emoji: '🌧️', label: 'Rainy Day Feels', gradient: 'from-blue-500/30 to-indigo-600/10', border: 'border-blue-500/30' },
  { mood: 'happy', emoji: '☀️', label: 'Good Vibes Only', gradient: 'from-yellow-500/30 to-amber-600/10', border: 'border-yellow-500/30' },
  { mood: 'chilled', emoji: '🌊', label: 'Chill Waves', gradient: 'from-cyan-500/30 to-sky-600/10', border: 'border-cyan-500/30' },
];

const Home = () => {
  const [selectedMood, setSelectedMood] = useState('energetic');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [forYou, setForYou] = useState([]);
  const [artists, setArtists] = useState([]);
  const [moodPlaylistData, setMoodPlaylistData] = useState({});
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const { recentlyPlayed, playTrack, setPlaylistAndPlay } = usePlayerStore();
  const { addToast } = useToastStore();

  // ── ML Text Input State ──
  const [feelingText, setFeelingText] = useState('');
  const [mlLoading, setMlLoading] = useState(false);
  const [mlResult, setMlResult] = useState(null); // { mood, emoji, confidence, source }

  // ── ML Text Submit ──
  const handleTextSubmit = async (e) => {
    e?.preventDefault();
    if (!feelingText.trim() || mlLoading) return;

    setMlLoading(true);
    setMlResult(null);
    setRecommendations([]);

    try {
      const data = await getRecommendations({ text: feelingText.trim(), count: 15 });
      const songs = data.recommendations || [];
      setRecommendations(songs);

      const moodInfo = {
        mood: data.detected_mood,
        emoji: data.emoji || '🎵',
        confidence: data.confidence,
      };
      setMlResult({ ...moodInfo, source: data.source, explanation: data.explanation });

      // Auto-play as playlist queue
      if (songs.length > 0) {
        setPlaylistAndPlay(songs, moodInfo);
        addToast(`🎵 Playing ${songs.length} songs for ${moodInfo.emoji} ${data.detected_mood} mood`, 'success');
      }

      // Track mood for dashboard
      const token = localStorage.getItem('neonpulse_token');
      if (token && data.detected_mood) {
        dashboardAPI.trackMood(data.detected_mood, feelingText.trim()).catch(() => {});
      }
    } catch (err) {
      addToast('Could not get recommendations. Try again!', 'error');
    } finally {
      setMlLoading(false);
    }
  };

  // ── Mood Tab Click ──
  const handleGenerate = async (moodOverride, autoPlay = false) => {
    setLoading(true);
    setRecommendations([]);
    setMlResult(null);

    const moodToUse = moodOverride || selectedMood;
    const data = await getRecommendations({ mood: moodToUse, intensity: 80, count: 15 });
    const songs = data.recommendations || [];
    setRecommendations(songs);

    const moodInfo = {
      mood: data.detected_mood || moodToUse,
      emoji: data.emoji || '🎵',
      confidence: data.confidence || 100,
    };
    setMlResult({ ...moodInfo, source: data.source, explanation: data.explanation });

    // Only auto-play when user explicitly clicked (not on page load)
    if (autoPlay && songs.length > 0) {
      setPlaylistAndPlay(songs, moodInfo);
      addToast(`🎵 Playing ${songs.length} songs for ${moodInfo.emoji} ${moodToUse} mood`, 'info');
    }

    setLoading(false);
    const token = localStorage.getItem('neonpulse_token');
    if (token && moodToUse) {
      dashboardAPI.trackMood(moodToUse, moodToUse).catch(() => {});
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await API.get('/api/songs?sort=popularity&order=desc&limit=10');
      const songs = res.data?.data?.songs || [];
      setTrending(songs.length > 0 ? songs.map((s) => ({ ...s, id: s._id || s.id })) : getTrendingSongs());
    } catch { setTrending(getTrendingSongs()); }
    finally { setTrendingLoading(false); }
  };

  useEffect(() => { 
    handleGenerate(); 
    fetchTrending();
    setForYou(getForYouSongs(8));
    setArtists(getAllArtists().slice(0, 8));
  }, []);

  const handleMoodPlaylistClick = (mood) => {
    if (expandedPlaylist === mood) { setExpandedPlaylist(null); return; }
    setExpandedPlaylist(mood);
    if (!moodPlaylistData[mood]) {
      setMoodPlaylistData(prev => ({ ...prev, [mood]: getMoodPlaylist(mood, 8) }));
    }
  };

  const handlePlayAll = (songs, label) => {
    if (songs.length > 0) {
      setPlaylistAndPlay(songs, { mood: label });
      addToast(`Playing ${label}`, 'info');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto w-[92%] max-w-7xl pt-6 pb-12">
      
      {/* ═══════════════ Hero Header ═══════════════ */}
      <div className="flex flex-col items-center justify-center text-center mt-4 mb-10 relative">
         <motion.div 
           animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
           transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
           className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[20vw] bg-primary/15 blur-[130px] rounded-full pointer-events-none z-0"
         />
         <motion.h1 
           initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
           className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tighter z-10 drop-shadow-2xl"
         >
           Discover your <br />
           <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary animate-gradient-x">Sonic Realm</span>
         </motion.h1>
         <motion.p 
           initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
           className="mt-5 text-[14px] sm:text-base text-textMuted max-w-xl z-10 font-medium px-4"
         >
           Transcend traditional playlists. Tell us how you feel or choose a frequency.
         </motion.p>
      </div>

      {/* ═══════════════ ML Text Input ═══════════════ */}
      <motion.section
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
        className="mb-10 max-w-2xl mx-auto z-10 relative"
      >
        <form onSubmit={handleTextSubmit} className="relative">
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 focus-within:bg-white/8 transition-all shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <MdPsychology className="text-2xl text-primary/60 ml-3 flex-shrink-0" />
            <input
              type="text"
              value={feelingText}
              onChange={(e) => setFeelingText(e.target.value)}
              placeholder="Tell me how you're feeling... (e.g. I feel very happy today!)"
              className="flex-1 bg-transparent border-none py-3 px-2 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none"
              disabled={mlLoading}
            />
            <button
              type="submit"
              disabled={mlLoading || !feelingText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm disabled:opacity-40 hover:shadow-[0_0_20px_rgba(255,0,127,0.4)] transition-all active:scale-95 flex-shrink-0"
            >
              {mlLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <MdSend className="text-lg" />
              )}
              <span className="hidden sm:inline">{mlLoading ? 'Detecting...' : 'Detect Mood'}</span>
            </button>
          </div>
        </form>

        {/* ML Result Banner */}
        <AnimatePresence>
          {mlResult && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mt-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl">{mlResult.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white capitalize">
                    {mlResult.mood} Mood Detected
                    <span className="text-xs text-textMuted font-normal ml-2">
                      {mlResult.confidence}% confidence
                    </span>
                  </p>
                  <p className="text-[11px] text-textMuted truncate">{mlResult.explanation}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                  mlResult.source === 'ml-model' 
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30' 
                    : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {mlResult.source === 'ml-model' ? '🤖 ML' : '📦 Local'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ═══════════════ Mood Tabs ═══════════════ */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
        className="mb-14 flex flex-wrap justify-center gap-2 z-10 relative px-4 w-full"
      >
        {moods.map(m => (
          <button 
            key={m.id}
            onClick={() => { setSelectedMood(m.id); setFeelingText(''); handleGenerate(m.id, true); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all duration-300 text-xs uppercase tracking-wide backdrop-blur-lg border shadow-sm ${
              selectedMood === m.id 
                ? 'bg-white/10 text-white border-primary/50 shadow-[0_0_20px_rgba(255,0,127,0.25)] ring-1 ring-primary/40 scale-105' 
                : 'bg-transparent border-white/5 text-textMuted hover:text-white hover:border-white/20 hover:bg-white/5'
            }`}
          >
            <span className="text-base opacity-80">{m.emoji}</span> <span>{m.label}</span>
          </button>
        ))}
      </motion.div>

      {/* ═══════════════ Recently Played ═══════════════ */}
      {recentlyPlayed.length > 0 && (
        <motion.section variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mb-14">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center"><MdHistory className="text-secondary text-lg" /></div>
            <h2 className="text-xl font-display font-bold text-white/90">Recently Played</h2>
            <button onClick={() => handlePlayAll(recentlyPlayed, 'Recently Played')} className="ml-auto flex items-center gap-1 text-xs text-textMuted hover:text-secondary font-bold transition-colors px-3 py-1.5 rounded-full hover:bg-secondary/10">
              <MdPlayArrow /> Play All
            </button>
          </div>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8">
            {recentlyPlayed.slice(0, 6).map((track) => (
              <motion.div key={`recent-${track.id}`} variants={itemVariants} className="will-change-transform">
                <TrackCard track={track} contextPlaylist={recentlyPlayed} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* ═══════════════ Trending Now ═══════════════ */}
      <motion.section variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mb-14">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><MdTrendingUp className="text-primary text-lg" /></div>
          <h2 className="text-xl font-display font-bold text-white/90">Trending Now</h2>
          <span className="text-xs text-textMuted bg-white/5 px-2.5 py-1 rounded-full font-semibold">🔥 Popular</span>
          <button onClick={() => handlePlayAll(trending, 'Trending Playlist')} className="ml-auto flex items-center gap-1 text-xs text-textMuted hover:text-primary font-bold transition-colors px-3 py-1.5 rounded-full hover:bg-primary/10">
            <MdPlayArrow /> Play All
          </button>
        </div>
        {trendingLoading ? <SkeletonLoader count={5} /> : trending.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
            {trending.map((track) => (
              <motion.div key={`trending-${track.id}`} variants={itemVariants} className="will-change-transform">
                <TrackCard track={track} contextPlaylist={trending} />
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </motion.section>

      {/* ═══════════════ For You ═══════════════ */}
      <motion.section variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mb-14">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><MdAutoAwesome className="text-purple-400 text-lg" /></div>
          <h2 className="text-xl font-display font-bold text-white/90">For You</h2>
          <span className="text-xs text-textMuted bg-white/5 px-2.5 py-1 rounded-full font-semibold">✨ Personalized</span>
          <button onClick={() => { setForYou(getForYouSongs(8)); addToast('Refreshed picks!', 'info'); }} className="ml-auto text-xs text-textMuted hover:text-purple-400 font-bold transition-colors px-3 py-1.5 rounded-full hover:bg-purple-500/10">↻ Refresh</button>
        </div>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-8">
          {forYou.map((track) => (
            <motion.div key={`foryou-${track.id}`} variants={itemVariants} className="will-change-transform">
              <TrackCard track={track} contextPlaylist={forYou} />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ═══════════════ Mood Playlists ═══════════════ */}
      <motion.section variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mb-14">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><MdQueueMusic className="text-cyan-400 text-lg" /></div>
          <h2 className="text-xl font-display font-bold text-white/90">Mood Playlists</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {moodPlaylistSuggestions.map((mp) => (
            <motion.button key={mp.mood} whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}
              onClick={() => handleMoodPlaylistClick(mp.mood)}
              className={`p-4 rounded-2xl border backdrop-blur-md text-left transition-all duration-300 ${
                expandedPlaylist === mp.mood
                  ? `bg-gradient-to-br ${mp.gradient} ${mp.border} shadow-lg ring-1 ring-white/10`
                  : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
              }`}
            >
              <span className="text-2xl mb-2 block">{mp.emoji}</span>
              <p className="text-sm font-bold text-white">{mp.label}</p>
              <p className="text-[10px] text-textMuted mt-0.5 uppercase tracking-wider">{mp.mood}</p>
            </motion.button>
          ))}
        </div>
        {expandedPlaylist && moodPlaylistData[expandedPlaylist] && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
            <div className="flex items-center gap-2 mb-4 px-2">
              <h3 className="text-base font-bold capitalize">{expandedPlaylist} Playlist</h3>
              <span className="text-xs text-textMuted">— {moodPlaylistData[expandedPlaylist].length} tracks</span>
              <button onClick={() => handlePlayAll(moodPlaylistData[expandedPlaylist], `${expandedPlaylist} Playlist`)}
                className="ml-auto flex items-center gap-1 text-xs text-secondary font-bold hover:bg-secondary/10 px-3 py-1 rounded-full transition-colors">
                <MdPlayArrow /> Play All
              </button>
            </div>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-8">
              {moodPlaylistData[expandedPlaylist].map((track) => (
                <motion.div key={`mood-pl-${track.id}`} variants={itemVariants} className="will-change-transform">
                  <TrackCard track={track} contextPlaylist={moodPlaylistData[expandedPlaylist]} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.section>

      {/* ═══════════════ Artist Spotlight ═══════════════ */}
      <motion.section variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="mb-14">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center"><MdPerson className="text-yellow-400 text-lg" /></div>
          <h2 className="text-xl font-display font-bold text-white/90">Artist Spotlight</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {artists.map((artist, i) => (
            <motion.div key={artist.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => { setSelectedMood(''); handleGenerate('chilled'); addToast(`Viewing ${artist.name}`, 'info'); }}
              className="flex flex-col items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-white/8 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,0,127,0.2)] group-hover:shadow-[0_0_30px_rgba(255,0,127,0.4)] transition-all">
                <img src={artist.image} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-white truncate max-w-full">{artist.name}</p>
                <p className="text-[10px] text-textMuted">{artist.songCount} songs</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ═══════════════ Mood Recommendations ═══════════════ */}
      <motion.section variants={sectionVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}>
        <div className="flex items-center justify-between mb-6 px-2 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><MdAutoAwesome className="text-purple-400 text-lg" /></div>
            <h2 className="text-xl font-display font-bold text-white/90">
              {mlResult?.emoji || moods.find(m => m.id === selectedMood)?.emoji} {mlResult?.mood || moods.find(m => m.id === selectedMood)?.label || 'Mood'} Vibes
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-textMuted">{recommendations.length} tracks</span>
            <button onClick={() => handlePlayAll(recommendations, `${selectedMood} Vibes`)}
              className="flex items-center gap-1 text-xs text-textMuted hover:text-white font-bold transition-colors px-3 py-1.5 rounded-full hover:bg-white/10">
              <MdPlayArrow /> Play All
            </button>
          </div>
        </div>
        {(loading || mlLoading) ? <SkeletonLoader count={10} /> : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8 mb-12">
            {recommendations.map((track) => (
               <motion.div key={track.id} variants={itemVariants} className="will-change-transform">
                 <TrackCard track={track} contextPlaylist={recommendations} />
               </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>
    </motion.div>
  );
};

export default Home;
