import React, { useEffect, useRef } from 'react';
import { 
  MdPlayCircleFilled, MdPauseCircleFilled, MdSkipNext, MdSkipPrevious, 
  MdVolumeUp, MdFavoriteBorder 
} from 'react-icons/md';
import usePlayerStore from '../../store/usePlayerStore';
import { Howl, Howler } from 'howler';

const PlayerBar = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, volume, setVolume, progress, setProgress } = usePlayerStore();
  const soundRef = useRef(null);
  const rafRef = useRef(null);

  // Initialize Audio
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.unload();
    }

    if (currentTrack?.audioUrl) {
      soundRef.current = new Howl({
        src: [currentTrack.audioUrl],
        html5: true, // Force HTML5 audio to allow streaming
        volume: volume,
        onplay: () => {
          updateProgress();
        },
        onend: () => {
          nextTrack();
        }
      });

      if (isPlaying) {
        soundRef.current.play();
      }
    }

    return () => {
      if (soundRef.current) soundRef.current.unload();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentTrack]);

  // Handle Play/Pause
  useEffect(() => {
    if (!soundRef.current) return;
    
    if (isPlaying && !soundRef.current.playing()) {
      soundRef.current.play();
    } else if (!isPlaying && soundRef.current.playing()) {
      soundRef.current.pause();
    }
  }, [isPlaying]);

  // Handle Volume
  useEffect(() => {
    Howler.volume(volume);
  }, [volume]);

  const updateProgress = () => {
    if (soundRef.current && soundRef.current.playing()) {
      setProgress(soundRef.current.seek() || 0);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (soundRef.current) {
      soundRef.current.seek(time);
    }
  };

  const formatTime = (secs) => {
    if (!secs) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const duration = currentTrack?.duration || soundRef.current?.duration() || 0;

  if (!currentTrack) {
    return (
      <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 h-24 bg-surface/95 backdrop-blur-2xl border-t border-borderSubtle flex items-center justify-center z-40">
        <p className="text-textMuted text-sm font-medium">Select a track to start listening</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[56px] md:bottom-0 left-0 right-0 h-24 bg-surface/95 backdrop-blur-2xl border-t border-borderSubtle px-4 md:px-8 flex items-center justify-between z-40 group hover:bg-surface transition-colors">
      
      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-0">
        <div className="w-14 h-14 bg-surfaceHover rounded-lg overflow-hidden flex-shrink-0 relative shadow-lg">
          <img 
            src={currentTrack.image || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop'} 
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h4 className="text-sm font-bold text-textMain truncate leading-tight hover:underline cursor-pointer">{currentTrack.title}</h4>
          <p className="text-xs text-textMuted truncate hover:underline cursor-pointer">{currentTrack.artist}</p>
        </div>
        <button className="text-textMuted hover:text-primary transition-colors ml-2 hidden md:block">
          <MdFavoriteBorder className="text-xl" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center max-w-lg w-full px-4">
        <div className="flex items-center gap-6 mb-2">
          <button onClick={prevTrack} className="text-textMuted hover:text-textMain transition-colors">
            <MdSkipPrevious className="text-3xl" />
          </button>
          <button 
            onClick={togglePlay}
            className="text-textMain hover:text-primary transition-colors hover:scale-105 transform duration-200"
          >
            {isPlaying ? (
              <MdPauseCircleFilled className="text-5xl" />
            ) : (
              <MdPlayCircleFilled className="text-5xl drop-shadow-[0_0_10px_rgba(223,142,255,0.4)]" />
            )}
          </button>
          <button onClick={nextTrack} className="text-textMuted hover:text-textMain transition-colors">
            <MdSkipNext className="text-3xl" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-3 w-full text-xs text-textMuted font-mono">
          <span>{formatTime(progress)}</span>
          <div className="relative flex-1 h-1.5 bg-surfaceHover rounded-full group-hover:h-2 transition-all cursor-pointer overflow-hidden flex items-center">
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={progress} 
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            />
            {/* Filled generic track */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary to-secondary rounded-full"
              style={{ width: `${(progress / (duration || 100)) * 100}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center justify-end gap-3 w-1/3 hidden md:flex">
        <MdVolumeUp className="text-xl text-textMuted" />
        <div className="relative w-24 h-1.5 bg-surfaceHover rounded-full overflow-hidden flex items-center group-hover:h-2 transition-all">
          <input 
            type="range" 
            min={0} 
            max={1} 
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
          />
          <div 
            className="absolute left-0 top-0 bottom-0 bg-textMain rounded-full"
            style={{ width: `${volume * 100}%` }}
          />
        </div>
      </div>

    </div>
  );
};

export default PlayerBar;
