import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose, MdPlayArrow, MdPause, MdQueueMusic, MdDelete } from 'react-icons/md';
import usePlayerStore from '../../store/usePlayerStore';

const PlaylistQueue = ({ isOpen, onClose }) => {
  const { 
    playlist, currentTrack, isPlaying, playTrack, togglePlay,
    removeFromPlaylist, clearPlaylist, detectedMood
  } = usePlayerStore();

  if (!isOpen) return null;

  const moodEmojis = {
    happy: '😊', sad: '😢', calm: '😌', energetic: '⚡',
    romantic: '💕', angry: '😠', excited: '🤩', anxious: '😰',
    hyper: '🤩', chilled: '🌊', focus: '🎯', melancholy: '🌙',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[60] max-h-[75vh] flex flex-col"
        >
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
            onClick={onClose}
          />

          {/* Queue Panel */}
          <div className="relative bg-[#0a0a0f]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl overflow-hidden flex flex-col max-h-[75vh]">
            
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(255,0,127,0.3)]">
                  <MdQueueMusic className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">Playlist Queue</h3>
                  <p className="text-[11px] text-textMuted font-medium">
                    {playlist.length} songs
                    {detectedMood && (
                      <span className="ml-2">
                        {moodEmojis[detectedMood] || '🎵'} <span className="capitalize">{detectedMood}</span> vibes
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {playlist.length > 0 && (
                  <button
                    onClick={clearPlaylist}
                    className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-textMuted hover:text-white transition-all"
                >
                  <MdClose className="text-lg" />
                </button>
              </div>
            </div>

            {/* Song List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MdQueueMusic className="text-5xl text-textMuted mb-4" />
                  <p className="text-textMuted font-semibold">No songs in queue</p>
                  <p className="text-xs text-textMuted mt-1">Select a mood or describe your feelings to get started!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {playlist.map((track, index) => {
                    const isCurrentSong = currentTrack?.id === track.id;
                    return (
                      <motion.div
                        key={`${track.id}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group cursor-pointer ${
                          isCurrentSong
                            ? 'bg-gradient-to-r from-primary/15 to-secondary/10 border border-primary/30 shadow-[0_0_15px_rgba(255,0,127,0.1)]'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                        onClick={() => {
                          if (isCurrentSong) togglePlay();
                          else playTrack(track);
                        }}
                      >
                        {/* Index / Play indicator */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                          isCurrentSong
                            ? 'bg-primary/20 text-primary'
                            : 'bg-white/5 text-textMuted group-hover:bg-white/10 group-hover:text-white'
                        }`}>
                          {isCurrentSong ? (
                            isPlaying ? (
                              <div className="flex items-end gap-[2px] h-3">
                                <div className="w-[2px] bg-primary rounded-full animate-eq-1" />
                                <div className="w-[2px] bg-primary rounded-full animate-eq-2" />
                                <div className="w-[2px] bg-primary rounded-full animate-eq-3" />
                              </div>
                            ) : (
                              <MdPause className="text-base" />
                            )
                          ) : (
                            <span className="group-hover:hidden">{index + 1}</span>
                          )}
                          {!isCurrentSong && (
                            <MdPlayArrow className="text-base hidden group-hover:block" />
                          )}
                        </div>

                        {/* Song Art */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                          <img 
                            src={track.image} 
                            alt={track.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = `https://picsum.photos/seed/${(track.title || '').replace(/\s+/g, '')}/80/80`; }}
                          />
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate transition-colors ${
                            isCurrentSong ? 'text-primary' : 'text-white group-hover:text-white'
                          }`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-textMuted truncate">{track.artist}</p>
                        </div>

                        {/* Duration + Preview badge */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {track.isPreview && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase tracking-wider">
                              30s
                            </span>
                          )}
                          <span className="text-xs text-textMuted font-mono">
                            {track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : '--'}
                          </span>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromPlaylist(index); }}
                          className="p-1.5 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <MdDelete className="text-sm" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom padding for player */}
            <div className="h-4" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlaylistQueue;
