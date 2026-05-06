import React, { useEffect, useRef } from 'react';
import { 
  MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious, 
  MdVolumeUp, MdVolumeOff, MdShuffle, MdRepeat, MdRepeatOne,
  MdQueueMusic
} from 'react-icons/md';
import usePlayerStore from '../../store/usePlayerStore';
import PlaylistQueue from './PlaylistQueue';
import { Howl, Howler } from 'howler';

const FloatingPlayer = () => {
  const { 
    currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, 
    volume, setVolume, progress, setProgress,
    shuffle, toggleShuffle, repeat, cycleRepeat,
    playlist, queueVisible, toggleQueue, setQueueVisible
  } = usePlayerStore();
  const soundRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (soundRef.current) soundRef.current.unload();
    if (currentTrack?.audioUrl) {
      soundRef.current = new Howl({
        src: [currentTrack.audioUrl],
        html5: true,
        volume: volume,
        onplay: () => updateProgress(),
        onend: () => nextTrack()
      });
      if (isPlaying) soundRef.current.play();
    }
    return () => {
      if (soundRef.current) soundRef.current.unload();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!soundRef.current) return;
    if (isPlaying && !soundRef.current.playing()) soundRef.current.play();
    else if (!isPlaying && soundRef.current.playing()) soundRef.current.pause();
  }, [isPlaying]);

  useEffect(() => { Howler.volume(volume); }, [volume]);

  const updateProgress = () => {
    if (soundRef.current && soundRef.current.playing()) {
      setProgress(soundRef.current.seek() || 0);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    if (soundRef.current) soundRef.current.seek(time);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const duration = currentTrack?.duration || soundRef.current?.duration() || 0;
  const progressPercent = duration ? (progress / duration) * 100 : 0;

  if (!currentTrack) return null;

  const RepeatIcon = repeat === 'one' ? MdRepeatOne : MdRepeat;

  return (
    <>
      {/* Playlist Queue Panel */}
      <PlaylistQueue isOpen={queueVisible} onClose={() => setQueueVisible(false)} />

      {/* Floating Player Bar */}
      <div className="fixed bottom-16 md:bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-[94%] md:w-auto md:min-w-[680px] md:max-w-[800px] acrylic rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-slide-up">
        
        {/* Progress bar - top edge */}
        <div className="absolute top-0 left-4 right-4 h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-150" 
            style={{ width: `${progressPercent}%` }} 
          />
        </div>

        <div className="flex items-center gap-4 mt-1">
          {/* Vinyl/Cover Art */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)] flex-shrink-0 ${isPlaying ? 'animate-spin-slow' : ''}`}
                 style={{ borderRadius: isPlaying ? '50%' : '12px', transition: 'border-radius 0.5s ease' }}>
              <img src={currentTrack.image} alt="art" className="w-full h-full object-cover" 
                   onError={(e) => { e.target.src = `https://picsum.photos/seed/${currentTrack.title}/100/100`; }} />
            </div>
            <div className="hidden sm:flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm text-white truncate">{currentTrack.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted font-medium truncate">{currentTrack.artist}</span>
              </div>
            </div>
          </div>

          {/* Mini Equalizer (visible when playing) */}
          {isPlaying && (
            <div className="hidden sm:flex items-end gap-[2px] h-4 mr-2">
              <div className="w-[3px] bg-primary rounded-full animate-eq-1" />
              <div className="w-[3px] bg-secondary rounded-full animate-eq-2" />
              <div className="w-[3px] bg-primary rounded-full animate-eq-3" />
              <div className="w-[3px] bg-secondary rounded-full animate-eq-4" />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleShuffle}
              className={`hidden sm:flex p-1.5 rounded-full transition-all ${shuffle ? 'text-secondary bg-secondary/10' : 'text-white/40 hover:text-white'}`}
            >
              <MdShuffle className="text-lg" />
            </button>
            <button onClick={prevTrack} className="text-white/60 hover:text-white hover:scale-110 transition-all">
              <MdSkipPrevious className="text-2xl" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              {isPlaying ? <MdPause className="text-2xl" /> : <MdPlayArrow className="text-2xl ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="text-white/60 hover:text-white hover:scale-110 transition-all">
              <MdSkipNext className="text-2xl" />
            </button>
            <button 
              onClick={cycleRepeat}
              className={`hidden sm:flex p-1.5 rounded-full transition-all ${repeat !== 'off' ? 'text-primary bg-primary/10' : 'text-white/40 hover:text-white'}`}
            >
              <RepeatIcon className="text-lg" />
            </button>
          </div>

          {/* Time + Seek (desktop) */}
          <div className="hidden md:flex items-center gap-2 w-36">
            <span className="text-[10px] text-textMuted font-mono w-8 text-right">{formatTime(progress)}</span>
            <div className="flex-1 relative h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${progressPercent}%` }} />
              <input 
                type="range" min={0} max={duration || 1} step={0.1} value={progress} onChange={handleSeek} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
            </div>
            <span className="text-[10px] text-textMuted font-mono w-8">{formatTime(duration)}</span>
          </div>

          {/* Queue Button */}
          <button 
            onClick={toggleQueue}
            className={`relative p-2 rounded-full transition-all ${
              queueVisible 
                ? 'text-secondary bg-secondary/15 shadow-[0_0_10px_rgba(0,240,255,0.2)]' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
            title="Playlist Queue"
          >
            <MdQueueMusic className="text-lg" />
            {playlist.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(255,0,127,0.5)]">
                {playlist.length > 99 ? '99' : playlist.length}
              </span>
            )}
          </button>

          {/* Volume (desktop) */}
          <div className="hidden lg:flex items-center gap-2">
            <button 
              onClick={() => setVolume(volume > 0 ? 0 : 0.8)} 
              className="text-white/50 hover:text-white transition-colors"
            >
              {volume === 0 ? <MdVolumeOff className="text-lg" /> : <MdVolumeUp className="text-lg" />}
            </button>
            <div className="relative w-20 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/50 rounded-full" style={{ width: `${volume * 100}%` }} />
              <input 
                type="range" min={0} max={1} step={0.01} value={volume} 
                onChange={(e) => setVolume(parseFloat(e.target.value))} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingPlayer;
