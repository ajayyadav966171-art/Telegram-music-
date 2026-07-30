import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, X, Music, Video } from 'lucide-react';
import { MediaFile } from '../types';

interface PlayerBarProps {
  currentFile: MediaFile | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onExpandNowPlaying: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentFile,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onClose,
  onNext,
  onPrev,
  onExpandNowPlaying,
}) => {
  if (!currentFile) return null;

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 glass-player flex items-center justify-between px-4 md:px-8 z-40 select-none shadow-2xl border-t border-white/10 group">
      {/* Top Mini Progress Indicator Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Left: Track Info & Artwork (Clicking expands full-screen player) */}
      <div
        onClick={onExpandNowPlaying}
        className="flex items-center gap-3 w-56 md:w-80 truncate cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg flex-shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform">
          {currentFile.category === 'video' ? (
            <Video className="w-5 h-5" />
          ) : (
            <Music className="w-5 h-5" />
          )}
        </div>
        <div className="truncate">
          <h4 className="text-sm font-semibold text-white truncate" title={currentFile.fileName}>
            {currentFile.title || currentFile.fileName}
          </h4>
          <p className="text-xs text-slate-400 truncate">
            {currentFile.artist || currentFile.caption || 'TeleCloud Media'}
          </p>
        </div>
      </div>

      {/* Center: Playback Controls */}
      <div className="flex items-center gap-3 md:gap-5">
        {onPrev && (
          <button
            onClick={onPrev}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5"
            title="Previous Track"
          >
            <SkipBack className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onTogglePlay}
          className="w-11 h-11 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-slate-950" />
          ) : (
            <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
          )}
        </button>

        {onNext && (
          <button
            onClick={onNext}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1.5"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right: Expand & Close */}
      <div className="flex items-center justify-end gap-2 w-56 md:w-80">
        <button
          onClick={onExpandNowPlaying}
          className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-1.5 text-xs font-medium"
          title="Open Full Screen Player"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Now Playing</span>
        </button>

        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          title="Close Player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
