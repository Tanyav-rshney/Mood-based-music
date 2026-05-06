import React, { useState } from 'react';
import { MdPlayArrow, MdPause, MdFavoriteBorder, MdFavorite } from 'react-icons/md';
import { motion } from 'framer-motion';
import usePlayerStore from '../../store/usePlayerStore';
import useFavoritesStore from '../../store/useFavoritesStore';
import useToastStore from '../../store/useToastStore';

const TrackCard = ({ track, contextPlaylist }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { addToast } = useToastStore();
  
  const isThisTrackPlaying = currentTrack?.id === track.id;
  const isFav = isFavorite(track.id);
  const [isHovered, setIsHovered] = useState(false);

  const imageToUse = track.image && !track.image.includes('images.unsplash.com/error') 
    ? track.image 
    : `https://picsum.photos/seed/${(track.title || '').replace(/\s+/g, '')}/400/400`;

  const handlePlay = (e) => {
    e.stopPropagation();
    if (isThisTrackPlaying) togglePlay();
    else {
      playTrack(track, contextPlaylist);
      addToast(`Now Playing: ${track.title}`, 'info');
    }
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    const wasAdded = toggleFavorite(track);
    addToast(
      wasAdded ? `Added "${track.title}" to Favorites ❤️` : `Removed "${track.title}" from Favorites`,
      wasAdded ? 'success' : 'info'
    );
  };

  return (
    <motion.div 
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative flex flex-col gap-3 cursor-pointer w-full max-w-sm mx-auto"
    >
      {/* Artwork Container */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg transition-all duration-500 bg-surface">
        <motion.img 
          src={imageToUse} 
          alt={track.title} 
          animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full h-full object-cover" 
          onError={(e) => { e.target.src = `https://picsum.photos/seed/${Math.random()}/400/400`; }}
        />
        
        {/* Edge Glow */}
        <div className={`absolute inset-0 ring-2 ring-inset transition-all duration-500 rounded-2xl pointer-events-none ${isThisTrackPlaying ? 'ring-primary shadow-[inset_0_0_20px_rgba(255,0,127,0.5)]' : 'ring-white/10 group-hover:ring-white/30'}`} />

        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 flex items-center justify-center ${isHovered || isThisTrackPlaying ? 'opacity-100' : 'opacity-0'}`}>
           <button 
             onClick={handlePlay}
             className="w-14 h-14 rounded-full acrylic flex items-center justify-center text-white border border-white/20 hover:scale-110 transition-transform shadow-[0_0_30px_rgba(0,240,255,0.3)]"
           >
             {isThisTrackPlaying && isPlaying ? (
               <MdPause className="text-3xl" />
             ) : (
               <MdPlayArrow className="text-3xl pl-0.5" />
             )}
           </button>
        </div>

        {/* Favorite Button */}
        <button 
          onClick={handleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all duration-300 acrylic border border-white/10 hover:scale-110 hover:bg-white/20 ${isHovered || isFav ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
        >
          {isFav ? <MdFavorite className="text-lg text-primary drop-shadow-[0_0_10px_rgba(255,0,127,0.8)]" /> : <MdFavoriteBorder className="text-lg text-white" />}
        </button>

        {/* Equalizer bars when playing */}
        {isThisTrackPlaying && isPlaying && (
          <div className="absolute bottom-3 left-3 flex gap-[2px] items-end h-4 pointer-events-none">
            <div className="w-[3px] bg-secondary rounded-full animate-eq-1" />
            <div className="w-[3px] bg-primary rounded-full animate-eq-2" />
            <div className="w-[3px] bg-secondary rounded-full animate-eq-3" />
          </div>
        )}

        {/* Genre tags */}
        {track.genres && track.genres.length > 0 && (
          <div className={`absolute bottom-3 right-3 flex gap-1 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {track.genres.slice(0, 2).map((g, i) => (
              <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white font-semibold uppercase tracking-wider">
                {g}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex flex-col px-1">
        <h3 className={`font-display font-semibold text-[15px] leading-tight truncate transition-colors duration-300 ${isThisTrackPlaying ? 'text-primary drop-shadow-[0_0_8px_rgba(255,0,127,0.4)]' : 'text-white group-hover:text-secondary'}`}>
          {track.title}
        </h3>
        <p className="text-textMuted font-medium text-xs tracking-wide truncate mt-1 transition-colors group-hover:text-white/80">{track.artist}</p>
      </div>
    </motion.div>
  );
};

export default TrackCard;
