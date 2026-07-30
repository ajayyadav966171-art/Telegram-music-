import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Download,
  Volume2,
  VolumeX,
  ListMusic,
  Clock,
  Gauge,
  Film,
  Music,
  X,
  Check,
  Maximize2
} from 'lucide-react';
import { MediaFile } from '../types';

interface NowPlayingModalProps {
  currentFile: MediaFile | null;
  isOpen: boolean;
  onClose: () => void; // Minimize to bottom mini-player
  onStop: () => void;  // Completely close player
  onOpenFullScreen: () => void; // Expand to full screen
  playlist: MediaFile[];
  onNext: () => void;
  onPrev: () => void;
  onSelectFile: (file: MediaFile) => void;
  onToggleFavorite: (id: string) => void;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  currentFile,
  isOpen,
  onClose,
  onStop,
  onOpenFullScreen,
  playlist,
  onNext,
  onPrev,
  onSelectFile,
  onToggleFavorite
}) => {
  const mediaRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Playback options
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);

  // Video vs Audio mode preference
  const [videoMode, setVideoMode] = useState<'video' | 'audio'>(() => {
    return (localStorage.getItem('telecloud_preferred_media_mode') as 'video' | 'audio') || 'video';
  });

  // Sleep Timer
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerEndTime, setSleepTimerEndTime] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);

  // Drawers & Modals
  const [showQueue, setShowQueue] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  // Sync mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('telecloud_preferred_media_mode', videoMode);
  }, [videoMode]);

  // Master media loading & setup
  useEffect(() => {
    if (!currentFile || !mediaRef.current) return;

    // Pause all other media elements in DOM to avoid duplicate audio
    document.querySelectorAll('audio, video').forEach((el) => {
      if (el !== mediaRef.current) {
        (el as HTMLMediaElement).pause();
      }
    });

    const targetSrc = `/api/media/stream/${currentFile.id}`;
    if (!mediaRef.current.src.endsWith(targetSrc)) {
      mediaRef.current.src = targetSrc;
      mediaRef.current.load();

      if (currentFile.playbackPosition && currentFile.playbackPosition > 0) {
        mediaRef.current.currentTime = currentFile.playbackPosition;
        setCurrentTime(currentFile.playbackPosition);
      }
    }

    mediaRef.current.playbackRate = playbackRate;

    let isCancelled = false;
    const playPromise = mediaRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (!isCancelled) setIsPlaying(true);
        })
        .catch((err) => {
          if (!isCancelled) console.log('Autoplay handled:', err);
        });
    }

    // Media Session (Lockscreen & Background playback)
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentFile.title || currentFile.fileName,
          artist: currentFile.artist || currentFile.caption || 'TeleCloud Storage',
          album: currentFile.album || 'TeleCloud Pro',
          artwork: [
            { src: currentFile.thumbnailUrl || '/icon.png', sizes: '512x512', type: 'image/png' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          mediaRef.current?.play();
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          mediaRef.current?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
        navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime && mediaRef.current) {
            mediaRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
          }
        });
      } catch (e) {}
    }

    return () => {
      isCancelled = true;
    };
  }, [currentFile?.id]);

  // Handle Playback End
  const handleEnded = () => {
    if (repeatMode === 'one' && mediaRef.current) {
      mediaRef.current.currentTime = 0;
      mediaRef.current.play();
    } else {
      handleNextTrack();
    }
  };

  // Track next with Shuffle support
  const handleNextTrack = () => {
    if (!currentFile || playlist.length === 0) return;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * playlist.length);
      onSelectFile(playlist[randomIndex]);
      return;
    }

    const idx = playlist.findIndex((f) => f.id === currentFile.id);
    if (idx !== -1) {
      if (idx < playlist.length - 1) {
        onSelectFile(playlist[idx + 1]);
      } else if (repeatMode === 'all') {
        onSelectFile(playlist[0]);
      }
    } else if (playlist.length > 0) {
      onSelectFile(playlist[0]);
    }
  };

  // Track prev
  const handlePrevTrack = () => {
    if (!currentFile || playlist.length === 0) return;

    const idx = playlist.findIndex((f) => f.id === currentFile.id);
    if (idx > 0) {
      onSelectFile(playlist[idx - 1]);
    } else if (repeatMode === 'all') {
      onSelectFile(playlist[playlist.length - 1]);
    }
  };

  // Periodically report playback progress to backend
  useEffect(() => {
    if (!currentFile || !isPlaying) return;

    const timer = setInterval(() => {
      if (mediaRef.current && currentTime > 0) {
        fetch('/api/playback/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId: currentFile.id,
            positionSeconds: currentTime,
            durationSeconds: duration
          })
        }).catch(() => {});
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [currentFile, isPlaying, currentTime, duration]);

  // Sleep Timer Countdown & Auto-pause
  useEffect(() => {
    if (!sleepTimerEndTime) {
      setTimeRemainingSeconds(null);
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((sleepTimerEndTime - now) / 1000));
      setTimeRemainingSeconds(diff);

      if (diff <= 0) {
        if (mediaRef.current) {
          mediaRef.current.pause();
          setIsPlaying(false);
        }
        setSleepTimerMinutes(null);
        setSleepTimerEndTime(null);
        setTimeRemainingSeconds(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerEndTime]);

  const handleSetSleepTimer = (mins: number | null) => {
    if (mins === null) {
      setSleepTimerMinutes(null);
      setSleepTimerEndTime(null);
      setTimeRemainingSeconds(null);
    } else {
      setSleepTimerMinutes(mins);
      setSleepTimerEndTime(Date.now() + mins * 60 * 1000);
    }
    setShowSleepMenu(false);
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!mediaRef.current) return;
    if (isMuted) {
      mediaRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      mediaRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skipSeconds = (sec: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + sec));
    }
  };

  const handleSetRate = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSleepTime = (sec: number | null) => {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!currentFile) return null;

  const isVideo = currentFile.category === 'video';
  const showVideoFrame = isVideo && videoMode === 'video';

  return (
    <>
      {/* Universal Hidden or Rendered Video Tag (Single Player Source) */}
      <video
        ref={mediaRef}
        onTimeUpdate={() => mediaRef.current && setCurrentTime(mediaRef.current.currentTime)}
        onLoadedMetadata={() => mediaRef.current && setDuration(mediaRef.current.duration)}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
        controls={isOpen && showVideoFrame}
        className={
          isOpen && showVideoFrame
            ? 'fixed inset-x-4 top-20 bottom-44 sm:inset-x-12 sm:top-24 sm:bottom-48 z-40 mx-auto max-w-4xl w-full h-[50vh] sm:h-[55vh] object-contain rounded-3xl bg-black border border-white/10 shadow-2xl'
            : 'hidden'
        }
      />

      {/* FULL-SCREEN NOW PLAYING MODAL PAGE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-4 md:p-8 select-none overflow-hidden text-white"
          >
            {/* Header / Pull Bar */}
            <div className="w-full flex items-center justify-between z-10 pb-2">
              <button
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                title="Minimize to Mini Player"
              >
                <ChevronDown className="w-5 h-5" />
                <span className="text-xs font-semibold hidden sm:inline">Minimize</span>
              </button>

              <div className="flex flex-col items-center">
                <span className="text-[10px] tracking-widest font-bold uppercase text-blue-400">
                  {isVideo ? (showVideoFrame ? 'Video Vault' : 'Audio Only Mode') : 'Music Library'}
                </span>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-300 max-w-xs truncate">
                  {currentFile.title || currentFile.fileName}
                </h3>
              </div>

              {/* Mode Toggle for Videos & Queue Toggle */}
              <div className="flex items-center gap-2">
                {isVideo && (
                  <div className="flex items-center p-1 rounded-xl bg-white/10 border border-white/10 text-xs">
                    <button
                      onClick={() => setVideoMode('video')}
                      className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        videoMode === 'video'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Play with video stream"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Video</span>
                    </button>
                    <button
                      onClick={() => setVideoMode('audio')}
                      className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        videoMode === 'audio'
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Play audio only"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Audio</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setShowQueue(!showQueue)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    showQueue
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                      : 'bg-white/10 border-white/10 text-slate-300 hover:text-white'
                  }`}
                  title="Playlist Queue"
                >
                  <ListMusic className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MAIN CENTER DISPLAY AREA */}
            <div className="flex-1 my-2 flex items-center justify-center relative w-full max-w-4xl mx-auto overflow-hidden min-h-[45vh]">
              {!showVideoFrame && (
                /* ALBUM ART / VINYL / AUDIO EQUALIZER VISUALIZER */
                <div className="flex flex-col items-center justify-center space-y-6 max-w-sm w-full">
                  <div className="relative group">
                    {/* Pulse Glow Effect */}
                    <div
                      className={`absolute -inset-4 rounded-full bg-gradient-to-tr ${
                        isVideo ? 'from-purple-600 to-indigo-600' : 'from-pink-600 to-blue-600'
                      } opacity-40 blur-2xl transition-all duration-700 ${isPlaying ? 'scale-110 opacity-70' : 'scale-95 opacity-20'}`}
                    />

                    {/* Artwork Vinyl Disk Container */}
                    <div className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 p-3 shadow-2xl border border-white/15 relative overflow-hidden flex items-center justify-center">
                      {currentFile.thumbnailUrl ? (
                        <img
                          src={currentFile.thumbnailUrl}
                          alt="Album Art"
                          className="w-full h-full object-cover rounded-2xl shadow-inner"
                        />
                      ) : (
                        <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-600/30 to-purple-600/30 border border-white/10 flex flex-col items-center justify-center text-white space-y-3 p-4">
                          {isVideo ? <Film className="w-16 h-16 text-purple-400" /> : <Music className="w-16 h-16 text-pink-400" />}
                          <span className="text-xs font-bold text-center text-slate-300 line-clamp-2">
                            {currentFile.artist || currentFile.caption || 'TeleCloud Audio'}
                          </span>
                        </div>
                      )}

                      {/* Animated Equalizer Spectrum Bars */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                        {[...Array(9)].map((_, i) => (
                          <span
                            key={i}
                            className={`w-1 rounded-full ${
                              isVideo ? 'bg-purple-400' : 'bg-pink-400'
                            } transition-all duration-300`}
                            style={{
                              height: isPlaying ? `${Math.floor(Math.random() * 20) + 8}px` : '4px',
                              animationDuration: `${0.4 + i * 0.1}s`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE-OVER PLAYLIST QUEUE DRAWER */}
              <AnimatePresence>
                {showQueue && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                    className="absolute inset-y-0 right-0 w-full sm:w-80 bg-slate-900/95 backdrop-blur-2xl border-l border-white/10 z-30 p-4 flex flex-col rounded-3xl shadow-2xl"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <ListMusic className="w-4 h-4 text-blue-400" />
                        <h4 className="text-sm font-bold text-white">Up Next ({playlist.length})</h4>
                      </div>
                      <button
                        onClick={() => setShowQueue(false)}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
                      {playlist.map((item, idx) => {
                        const isCurrent = item.id === currentFile.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              onSelectFile(item);
                              setShowQueue(false);
                            }}
                            className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-blue-600/30 border-blue-500/50 text-white'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-500 w-4 text-center">
                              {idx + 1}
                            </span>
                            <div className="truncate flex-1">
                              <h5 className="text-xs font-bold truncate">{item.title || item.fileName}</h5>
                              <p className="text-[10px] text-slate-400 truncate">{item.artist || item.category}</p>
                            </div>
                            {isCurrent && <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* TRACK DETAILS & FAVORITE BUTTON */}
            <div className="w-full max-w-2xl mx-auto flex items-center justify-between z-10 px-2 my-1">
              <div className="truncate">
                <h2 className="text-base sm:text-xl font-bold text-white truncate" title={currentFile.fileName}>
                  {currentFile.title || currentFile.fileName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 truncate">
                  {currentFile.artist || currentFile.caption || 'TeleCloud Media'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleFavorite(currentFile.id)}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    currentFile.isFavorite
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                  title="Favorite Track"
                >
                  <Heart className={`w-5 h-5 ${currentFile.isFavorite ? 'fill-rose-400' : ''}`} />
                </button>

                <a
                  href={`/api/media/stream/${currentFile.id}`}
                  download={currentFile.fileName}
                  className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* WAVEFORM / SCRUBBER TIMELINE */}
            <div className="w-full max-w-2xl mx-auto space-y-1 z-10 px-2 my-1">
              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-white/30"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* TRANSPORT CONTROLS */}
            <div className="w-full max-w-2xl mx-auto flex items-center justify-between z-10 my-2 px-4">
              {/* Shuffle */}
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  isShuffle ? 'text-blue-400 font-bold bg-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
                title="Shuffle Queue"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              {/* Prev */}
              <button
                onClick={handlePrevTrack}
                className="p-2.5 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-6 h-6" />
              </button>

              {/* Rewind 10s */}
              <button
                onClick={() => skipSeconds(-10)}
                className="p-2 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer hidden sm:block"
                title="Rewind 10s"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Play / Pause Main Button */}
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 fill-slate-950" />
                ) : (
                  <Play className="w-8 h-8 fill-slate-950 ml-1" />
                )}
              </button>

              {/* Forward 10s */}
              <button
                onClick={() => skipSeconds(10)}
                className="p-2 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer hidden sm:block"
                title="Forward 10s"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Next */}
              <button
                onClick={handleNextTrack}
                className="p-2.5 rounded-2xl text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-6 h-6" />
              </button>

              {/* Repeat */}
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  repeatMode !== 'off'
                    ? 'text-blue-400 font-bold bg-blue-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Repeat Mode: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* BOTTOM UTILITY ROW: SPEED, SLEEP TIMER, VOLUME */}
            <div className="w-full max-w-2xl mx-auto flex items-center justify-between z-10 pt-2 border-t border-white/10 px-2">
              {/* Playback Speed Button & Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span>{playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-10 left-0 w-36 bg-slate-900 border border-white/15 rounded-2xl p-2 shadow-2xl z-40 space-y-1">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSetRate(rate)}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                          playbackRate === rate ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{rate}x</span>
                        {playbackRate === rate && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sleep Timer Button & Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSleepMenu(!showSleepMenu)}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 cursor-pointer ${
                    sleepTimerMinutes
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {sleepTimerMinutes ? formatSleepTime(timeRemainingSeconds) : 'Sleep Timer'}
                  </span>
                </button>

                {showSleepMenu && (
                  <div className="absolute bottom-10 right-0 w-40 bg-slate-900 border border-white/15 rounded-2xl p-2 shadow-2xl z-40 space-y-1">
                    {[
                      { label: 'Off', val: null },
                      { label: '15 Minutes', val: 15 },
                      { label: '30 Minutes', val: 30 },
                      { label: '45 Minutes', val: 45 },
                      { label: '60 Minutes', val: 60 }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleSetSleepTimer(opt.val)}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between cursor-pointer ${
                          sleepTimerMinutes === opt.val
                            ? 'bg-amber-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {sleepTimerMinutes === opt.val && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume Slider */}
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white cursor-pointer">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MINIMIZED BOTTOM MINI PLAYER BAR */}
      {!isOpen && currentFile && (
        <div
          onClick={onOpenFullScreen}
          className="fixed bottom-0 left-0 right-0 h-20 glass-player flex items-center justify-between px-3 md:px-6 z-40 select-none shadow-2xl cursor-pointer border-t border-white/10 group"
        >
          {/* Progress line at top edge of mini player */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Left: Artwork & Info */}
          <div className="flex items-center gap-3 w-52 md:w-72 truncate">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg flex-shrink-0 relative overflow-hidden">
              {currentFile.thumbnailUrl ? (
                <img src={currentFile.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : isVideo ? (
                <Film className="w-5 h-5 text-purple-300" />
              ) : (
                <Music className="w-5 h-5 text-pink-300" />
              )}
            </div>

            <div className="truncate">
              <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {currentFile.title || currentFile.fileName}
              </h4>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span>{currentFile.artist || 'TeleCloud Pro'}</span>
                {isVideo && (
                  <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                    {videoMode === 'audio' ? '🎵 Audio' : '🎬 Video'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handlePrevTrack}
              className="text-slate-400 hover:text-white p-1.5 transition-colors cursor-pointer"
              title="Previous"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
            </button>

            <button
              onClick={handleNextTrack}
              className="text-slate-400 hover:text-white p-1.5 transition-colors cursor-pointer"
              title="Next"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Expand & Close */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onOpenFullScreen}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Expand to Full Screen Player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={onStop}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
