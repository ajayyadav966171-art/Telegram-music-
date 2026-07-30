import React from 'react';
import { motion } from 'motion/react';
import { Play, Download, Heart, Trash2, Music, Video, FileText, Image, Box, HardDrive, ListPlus, Clock, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { MediaFile } from '../types';

interface FileCardProps {
  file: MediaFile;
  onPlay: (file: MediaFile) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onAddToPlaylist?: (file: MediaFile) => void;
  onToggleKeepOffline?: (id: string) => void;
  isPlaying?: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onPlay,
  onToggleFavorite,
  onDelete,
  onAddToPlaylist,
  onToggleKeepOffline,
  isPlaying = false
}) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return null;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getCategoryTheme = (cat: MediaFile['category']) => {
    switch (cat) {
      case 'music':
        return {
          badge: 'MP3',
          label: 'Audio',
          bg: 'from-pink-600/80 to-purple-800/80',
          icon: Music,
          color: 'text-pink-400'
        };
      case 'video':
        return {
          badge: 'MKV',
          label: 'Video',
          bg: 'from-blue-600/80 to-indigo-900/80',
          icon: Video,
          color: 'text-blue-400'
        };
      case 'document':
        return {
          badge: 'PDF',
          label: 'Doc',
          bg: 'from-emerald-600/80 to-teal-900/80',
          icon: FileText,
          color: 'text-emerald-400'
        };
      case 'apk':
        return {
          badge: 'APK',
          label: 'App',
          bg: 'from-amber-600/80 to-orange-900/80',
          icon: Box,
          color: 'text-amber-400'
        };
      case 'photo':
        return {
          badge: 'IMG',
          label: 'Photo',
          bg: 'from-rose-600/80 to-pink-900/80',
          icon: Image,
          color: 'text-rose-400'
        };
      default:
        return {
          badge: 'FILE',
          label: 'File',
          bg: 'from-slate-700 to-slate-900',
          icon: HardDrive,
          color: 'text-slate-400'
        };
    }
  };

  const theme = getCategoryTheme(file.category);
  const CategoryIcon = theme.icon;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/media/stream/${file.id}`;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const durationStr = formatDuration(file.duration);
  const progressPercent = (file.playbackPosition && file.duration)
    ? Math.min(100, (file.playbackPosition / file.duration) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={() => onPlay(file)}
      className={`group relative glass-panel glass-panel-hover rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between select-none ${
        isPlaying ? 'ring-2 ring-blue-500 border-blue-500/50' : ''
      }`}
    >
      {/* Thumbnail Area */}
      <div className={`h-28 w-full bg-gradient-to-br ${theme.bg} relative flex items-center justify-center p-4 overflow-hidden`}>
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.fileName}
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <CategoryIcon className="w-20 h-20 absolute -right-3 -bottom-3 opacity-15 text-white" />
        )}

        {/* Category & Offline Badge Pills */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          <div className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-[10px] font-bold text-white tracking-widest border border-white/10 uppercase">
            {theme.badge}
          </div>
          {file.isCached && (
            <div className="px-1.5 py-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Offline</span>
            </div>
          )}
          {file.cacheStatus === 'caching' && (
            <div className="px-1.5 py-0.5 rounded-md bg-amber-500/80 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 shadow-sm">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              <span>{file.cacheProgress || 0}%</span>
            </div>
          )}
        </div>

        {/* Duration Badge */}
        {durationStr && (
          <div className="absolute bottom-3 right-3 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-medium text-white flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>{durationStr}</span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(file.id);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white transition-all cursor-pointer z-10"
        >
          <Heart className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-300'}`} />
        </button>

        {/* Center Play Overlay Button */}
        {(file.category === 'music' || file.category === 'video') && (
          <div className="w-11 h-11 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform z-10">
            <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
          </div>
        )}
      </div>

      {/* Continue Listening/Watching Progress Bar */}
      {progressPercent > 0 && (
        <div className="w-full h-1 bg-white/10">
          <div className="h-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      {/* File Info Area */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-xs md:text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors" title={file.fileName}>
            {file.title || file.fileName}
          </h3>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            {file.artist || file.caption || file.fileName}
          </p>
        </div>

        {/* File Meta Bar */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {formatSize(file.fileSize)} • {theme.label}
          </span>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {onToggleKeepOffline && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleKeepOffline(file.id);
                }}
                title={file.keepOffline ? 'Pinned Offline' : 'Keep Offline'}
                className={`p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer ${
                  file.keepOffline ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            )}
            {onAddToPlaylist && (file.category === 'music' || file.category === 'video') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToPlaylist(file);
                }}
                title="Add to Playlist"
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={handleDownload}
              title="Download File"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              title="Delete File"
              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
