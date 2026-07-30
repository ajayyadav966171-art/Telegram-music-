import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatsGrid } from './StatsGrid';
import { FileCard } from './FileCard';
import { PlayerBar } from './PlayerBar';
import { NowPlayingModal } from './NowPlayingModal';
import { SettingsModal } from './SettingsModal';
import { UploadModal } from './UploadModal';
import { PlaylistModal } from './PlaylistModal';
import { UploadQueueDrawer } from './UploadQueueDrawer';
import { MediaFile, StorageStats, TelegramSettings, Playlist, UploadQueueItem } from './types';
import { Sparkles, RefreshCw, Filter, Music, Video, FileText, Image, Box, Heart, ArrowUpDown, ShieldCheck, Play, Pause, X } from 'lucide-react';

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'size' | 'name'>('newest');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [settings, setSettings] = useState<TelegramSettings | null>(null);

  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  // Player State
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | 'end' | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [videoMode, setVideoMode] = useState<'video' | 'audio'>(() => {
    return (localStorage.getItem('telecloud_video_mode') as 'video' | 'audio') || 'video';
  });

  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const hasRestoredPlaybackRef = useRef<boolean>(false);
  const shouldAutoResumeRef = useRef<boolean>(false);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Fetch data on load
  const loadData = async () => {
    try {
      const [filesRes, statsRes, settingsRes, playlistsRes] = await Promise.all([
        fetch('/api/files'),
        fetch('/api/files/stats'),
        fetch('/api/settings'),
        fetch('/api/playlists')
      ]);

      if (filesRes.ok) setFiles(await filesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (playlistsRes.ok) setPlaylists(await playlistsRes.json());
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Background Upload Queue Worker
  useEffect(() => {
    const nextItem = uploadQueue.find(i => i.status === 'queued');
    if (!nextItem) return;

    const processUpload = async () => {
      setUploadQueue(prev => prev.map(i => i.id === nextItem.id ? { ...i, status: 'uploading', progress: 10 } : i));

      const formData = new FormData();
      formData.append('file', nextItem.file);
      formData.append('title', nextItem.title || nextItem.file.name);

      try {
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          setUploadQueue(prev => prev.map(i => i.id === nextItem.id ? { ...i, status: 'success', progress: 100 } : i));
          loadData();
        } else {
          const errData = await res.json().catch(() => ({}));
          setUploadQueue(prev => prev.map(i => i.id === nextItem.id ? { ...i, status: 'error', errorMsg: errData.error || 'Upload failed' } : i));
        }
      } catch (err: any) {
        setUploadQueue(prev => prev.map(i => i.id === nextItem.id ? { ...i, status: 'error', errorMsg: err.message || 'Network error' } : i));
      }
    };

    processUpload();
  }, [uploadQueue]);

  const handleEnqueueFiles = (newFiles: File[]) => {
    const items: UploadQueueItem[] = newFiles.map((file, index) => ({
      id: `queue-${Date.now()}-${index}`,
      file,
      progress: 0,
      status: 'queued',
      title: file.name.replace(/\.[^/.]+$/, "")
    }));

    setUploadQueue(prev => [...prev, ...items]);
    setIsQueueOpen(true);
  };

  const handlePauseQueueItem = (id: string) => {
    setUploadQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'paused' } : i));
  };

  const handleResumeQueueItem = (id: string) => {
    setUploadQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'queued' } : i));
  };

  const handleRetryQueueItem = (id: string) => {
    setUploadQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'queued', progress: 0, errorMsg: undefined } : i));
  };

  const handleCancelQueueItem = (id: string) => {
    setUploadQueue(prev => prev.filter(i => i.id !== id));
  };

  const handleClearCompletedQueue = () => {
    setUploadQueue(prev => prev.filter(i => i.status !== 'success'));
  };

  // Clear Local Offline Cache
  const handleClearCache = async () => {
    if (!confirm('Clear local media stream cache? Files remain safely stored on Telegram.')) return;
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Poll background caching progress if any file is in caching state
  useEffect(() => {
    const isCachingAny = files.some(f => f.cacheStatus === 'caching');
    if (!isCachingAny) return;

    const interval = setInterval(() => {
      loadData();
    }, 2000);

    return () => clearInterval(interval);
  }, [files]);

  // Filter & Sort files
  const filteredFiles = files.filter(f => {
    if (activeTab === 'favorites') {
      if (!f.isFavorite) return false;
    } else if (activeTab === 'offline') {
      if (!f.isCached && !f.keepOffline && f.cacheStatus !== 'caching') return false;
    } else if (activeTab === 'playlists') {
      return f.category === 'music' || f.category === 'video';
    } else if (activeTab !== 'all' && f.category !== activeTab) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.fileName.toLowerCase().includes(q) ||
        (f.caption && f.caption.toLowerCase().includes(q)) ||
        (f.artist && f.artist.toLowerCase().includes(q)) ||
        (f.title && f.title.toLowerCase().includes(q))
      );
    }

    return true;
  }).sort((a, b) => {
    if (sortOption === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortOption === 'size') {
      return b.fileSize - a.fileSize;
    }
    if (sortOption === 'name') {
      return a.fileName.localeCompare(b.fileName);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Persistent Playback State Saver
  const savePlaybackState = (customPos?: number) => {
    if (!currentFile) return;
    const currentPos = typeof customPos === 'number' ? customPos : (mediaRef.current?.currentTime || currentTime);
    const stateToSave = {
      currentFileId: currentFile.id,
      playbackPosition: currentPos,
      videoMode,
      volume,
      isMuted,
      playbackSpeed,
      wasPlaying: isPlaying,
      isNowPlayingOpen,
      repeatMode,
      isShuffle,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem('telecloud_playback_state', JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save playback state:', e);
    }
  };

  // Save on beforeunload & pagehide
  useEffect(() => {
    const handleUnload = () => {
      savePlaybackState();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [currentFile, currentTime, videoMode, volume, isMuted, playbackSpeed, isPlaying, isNowPlayingOpen, repeatMode, isShuffle]);

  // Continuously sync playback state
  useEffect(() => {
    if (currentFile) {
      savePlaybackState();
    }
  }, [currentFile?.id, currentTime, isPlaying, videoMode, volume, isMuted, playbackSpeed, isNowPlayingOpen, repeatMode, isShuffle]);

  // Restore playback state on page load when files are loaded
  useEffect(() => {
    if (files.length === 0 || hasRestoredPlaybackRef.current) return;
    hasRestoredPlaybackRef.current = true;

    const rawSaved = localStorage.getItem('telecloud_playback_state');
    if (!rawSaved) return;

    try {
      const saved = JSON.parse(rawSaved);
      if (!saved || !saved.currentFileId) return;

      const matchedFile = files.find((f) => f.id === saved.currentFileId);
      if (!matchedFile) return;

      const savedPos = typeof saved.playbackPosition === 'number' ? saved.playbackPosition : 0;
      matchedFile.playbackPosition = savedPos;

      if (saved.videoMode) setVideoMode(saved.videoMode);
      if (typeof saved.volume === 'number') setVolume(saved.volume);
      if (typeof saved.isMuted === 'boolean') setIsMuted(saved.isMuted);
      if (typeof saved.playbackSpeed === 'number') setPlaybackSpeed(saved.playbackSpeed);
      if (saved.repeatMode) setRepeatMode(saved.repeatMode);
      if (typeof saved.isShuffle === 'boolean') setIsShuffle(saved.isShuffle);
      if (typeof saved.isNowPlayingOpen === 'boolean') setIsNowPlayingOpen(saved.isNowPlayingOpen);

      setCurrentTime(savedPos);
      setCurrentFile(matchedFile);

      if (saved.wasPlaying) {
        shouldAutoResumeRef.current = true;
        setShowResumePrompt(true);
      }
    } catch (e) {
      console.error('Error restoring saved playback state:', e);
    }
  }, [files]);

  // Resume Playback manually (or via button tap)
  const handleResumePlayback = async () => {
    if (mediaRef.current) {
      try {
        if (currentTime > 0 && Math.abs(mediaRef.current.currentTime - currentTime) > 0.5) {
          mediaRef.current.currentTime = currentTime;
        }
        await mediaRef.current.play();
        setIsPlaying(true);
        setShowResumePrompt(false);
      } catch (e) {
        console.error('Failed to resume playback:', e);
      }
    }
  };

  // Media loading & MediaSession binding
  useEffect(() => {
    if (!currentFile || !mediaRef.current) return;

    // Ensure all other media elements in DOM are paused
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

    mediaRef.current.playbackRate = playbackSpeed;
    mediaRef.current.volume = isMuted ? 0 : volume;

    const autoResume = shouldAutoResumeRef.current;
    shouldAutoResumeRef.current = false;

    if (autoResume) {
      const playPromise = mediaRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setShowResumePrompt(false);
          })
          .catch((err) => {
            console.log('Autoplay handled on restore:', err);
            setIsPlaying(false);
            setShowResumePrompt(true);
          });
      }
    }

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentFile.title || currentFile.fileName,
          artist: currentFile.artist || 'TeleCloud Media',
          album: 'TeleCloud Pro',
        });
        navigator.mediaSession.setActionHandler('play', () => {
          mediaRef.current?.play();
          setIsPlaying(true);
          setShowResumePrompt(false);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          mediaRef.current?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
        navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
      } catch (e) {}
    }
  }, [currentFile?.id]);

  // Handle Play
  const handlePlay = (file: MediaFile) => {
    if (file.category === 'music' || file.category === 'video') {
      setShowResumePrompt(false);
      shouldAutoResumeRef.current = true;
      setCurrentFile(file);
      setIsNowPlayingOpen(true);
    } else {
      window.open(`/api/media/stream/${file.id}`, '_blank');
    }
  };

  const togglePlay = () => {
    if (!mediaRef.current) return;
    setShowResumePrompt(false);
    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    if (mediaRef.current) {
      mediaRef.current.volume = vol;
    }
  };

  const handleToggleMute = () => {
    if (!mediaRef.current) return;
    if (isMuted) {
      mediaRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      mediaRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSkipSeconds = (sec: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + sec));
    }
  };

  const handleChangeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = speed;
    }
  };

  const handleToggleVideoMode = () => {
    const nextMode = videoMode === 'video' ? 'audio' : 'video';
    setVideoMode(nextMode);
    localStorage.setItem('telecloud_video_mode', nextMode);
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleSetSleepTimer = (mins: number | 'end' | null) => {
    setSleepTimerMinutes(mins);
    if (typeof mins === 'number') {
      setSleepTimerRemaining(mins * 60);
    } else {
      setSleepTimerRemaining(null);
    }
  };

  // Sleep Timer Countdown Worker
  useEffect(() => {
    if (sleepTimerMinutes === null || sleepTimerMinutes === 'end' || !isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null) return typeof sleepTimerMinutes === 'number' ? sleepTimerMinutes * 60 : null;
        if (prev <= 1) {
          if (mediaRef.current) mediaRef.current.pause();
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerMinutes, isPlaying]);

  // Playlist Queue
  const playlist = filteredFiles.filter((f) => f.category === 'music' || f.category === 'video');

  const handleNextTrack = () => {
    if (!currentFile || playlist.length === 0) return;

    if (isShuffle) {
      const remaining = playlist.filter((f) => f.id !== currentFile.id);
      if (remaining.length > 0) {
        const randomTrack = remaining[Math.floor(Math.random() * remaining.length)];
        handlePlay(randomTrack);
        return;
      }
    }

    const idx = playlist.findIndex((f) => f.id === currentFile.id);
    if (idx !== -1) {
      if (idx < playlist.length - 1) {
        handlePlay(playlist[idx + 1]);
      } else if (repeatMode === 'all') {
        handlePlay(playlist[0]);
      }
    }
  };

  const handlePrevTrack = () => {
    if (!currentFile || playlist.length === 0) return;
    const idx = playlist.findIndex((f) => f.id === currentFile.id);
    if (idx > 0) {
      handlePlay(playlist[idx - 1]);
    } else if (repeatMode === 'all') {
      handlePlay(playlist[playlist.length - 1]);
    }
  };

  const handleTrackEnded = () => {
    if (repeatMode === 'one') {
      if (mediaRef.current) {
        mediaRef.current.currentTime = 0;
        mediaRef.current.play();
      }
      return;
    }

    if (sleepTimerMinutes === 'end') {
      if (mediaRef.current) mediaRef.current.pause();
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      setSleepTimerRemaining(null);
      return;
    }

    handleNextTrack();
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}/favorite`, { method: 'POST' });
      if (res.ok) {
        const { isFavorite } = await res.json();
        setFiles(prev => prev.map(f => f.id === id ? { ...f, isFavorite } : f));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Keep Offline Pin
  const handleToggleKeepOffline = async (id: string) => {
    const targetFile = files.find(f => f.id === id);
    if (!targetFile) return;

    const nextState = !targetFile.keepOffline;
    try {
      const res = await fetch(`/api/files/${id}/keep-offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepOffline: nextState })
      });
      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === id ? {
          ...f,
          keepOffline: nextState,
          cacheStatus: (nextState && !f.isCached) ? 'caching' : f.cacheStatus
        } : f));
        loadData();
      }
    } catch (e) {
      console.error('Error toggling keep offline:', e);
    }
  };

  // Delete File
  const handleDeleteFile = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file index?')) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== id));
        if (currentFile?.id === id) setCurrentFile(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sync Channel
  const handleSyncChannel = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/telegram/sync', { method: 'POST' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (newSettings: Partial<TelegramSettings>) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    await loadData();
  };

  // Test Telegram Connection
  const handleTestConnection = async (botToken: string, channelId: string) => {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, channelId })
    });
    return res.json();
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-white pb-24`}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fileCounts={stats?.categories}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main App Canvas */}
      <main className="flex-1 flex flex-col px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onSyncChannel={handleSyncChannel}
          isSyncing={isSyncing}
          syncStatus={stats?.syncStatus}
          queueCount={uploadQueue.filter(i => i.status === 'queued' || i.status === 'uploading').length}
          onOpenQueue={() => setIsQueueOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Dashboard Stats Panel */}
        <StatsGrid stats={stats} onClearCache={handleClearCache} />

        {/* Filter Controls & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 my-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {activeTab === 'all' && 'All Cloud Files'}
              {activeTab === 'music' && 'Music & Audio Library'}
              {activeTab === 'video' && 'Video Vault'}
              {activeTab === 'offline' && 'Offline Library & Cached Media'}
              {activeTab === 'document' && 'Documents & PDFs'}
              {activeTab === 'photo' && 'Photos & Gallery'}
              {activeTab === 'apk' && 'APKs & Applications'}
              {activeTab === 'favorites' && 'Favorites & Bookmarks'}
              {activeTab === 'playlists' && 'Custom Playlists'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-white/5">
              {filteredFiles.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-xl text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-slate-900">Newest First</option>
                <option value="oldest" className="bg-slate-900">Oldest First</option>
                <option value="size" className="bg-slate-900">File Size</option>
                <option value="name" className="bg-slate-900">File Name</option>
              </select>
            </div>
          </div>
        </div>

        {/* File Cards Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + '-' + sortOption + '-' + searchQuery}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {filteredFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPlay={handlePlay}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleKeepOffline={handleToggleKeepOffline}
                    onDelete={handleDeleteFile}
                    onAddToPlaylist={() => setIsPlaylistModalOpen(true)}
                    isPlaying={currentFile?.id === file.id}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 glass-panel rounded-3xl text-center space-y-3 my-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white">No files found</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  {searchQuery
                    ? `No matching items found for "${searchQuery}".`
                    : 'Upload files or connect your private Telegram storage channel to auto-sync files.'}
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg cursor-pointer"
                >
                  Upload First File
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Central Persistent Video / Audio Element */}
      <div
        className={
          isNowPlayingOpen && currentFile?.category === 'video' && videoMode === 'video'
            ? "fixed inset-0 z-[55] flex items-center justify-center p-4 sm:p-12 pointer-events-none"
            : "fixed bottom-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
        }
      >
        <div
          className={
            isNowPlayingOpen && currentFile?.category === 'video' && videoMode === 'video'
              ? "w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto flex items-center justify-center"
              : "w-full h-full"
          }
        >
          <video
            ref={mediaRef}
            onTimeUpdate={() => mediaRef.current && setCurrentTime(mediaRef.current.currentTime)}
            onLoadedMetadata={() => mediaRef.current && setDuration(mediaRef.current.duration)}
            onEnded={handleTrackEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            controls={isNowPlayingOpen && currentFile?.category === 'video' && videoMode === 'video'}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Background Upload Queue Drawer */}
      <UploadQueueDrawer
        queue={uploadQueue}
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        onPauseItem={handlePauseQueueItem}
        onResumeItem={handleResumeQueueItem}
        onRetryItem={handleRetryQueueItem}
        onCancelItem={handleCancelQueueItem}
        onClearCompleted={handleClearCompletedQueue}
      />

      {/* Playlist Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        files={files}
        playlists={playlists}
        onRefreshPlaylists={loadData}
        onPlayFile={handlePlay}
      />

      {/* Resume Playback Floating Prompt Banner */}
      <AnimatePresence>
        {showResumePrompt && currentFile && !isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 sm:gap-4 select-none backdrop-blur-xl"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wide">
                Resume Playback ({formatTime(currentTime)})
              </span>
              <span className="text-[11px] text-blue-100 truncate max-w-[160px] sm:max-w-[240px]">
                {currentFile.title || currentFile.fileName}
              </span>
            </div>
            <button
              onClick={handleResumePlayback}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-blue-900 text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all shadow-lg cursor-pointer flex-shrink-0 ml-1"
            >
              Resume Playback
            </button>
            <button
              onClick={() => setShowResumePrompt(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white cursor-pointer ml-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player Bar */}
      {!isNowPlayingOpen && currentFile && (
        <PlayerBar
          currentFile={currentFile}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={togglePlay}
          onClose={() => {
            if (mediaRef.current) mediaRef.current.pause();
            setCurrentFile(null);
            setIsNowPlayingOpen(false);
            setShowResumePrompt(false);
            localStorage.removeItem('telecloud_playback_state');
          }}
          onNext={handleNextTrack}
          onPrev={handlePrevTrack}
          onExpandNowPlaying={() => setIsNowPlayingOpen(true)}
        />
      )}

      {/* Full Screen Dedicated Now Playing Modal */}
      <NowPlayingModal
        isOpen={isNowPlayingOpen}
        onClose={() => setIsNowPlayingOpen(false)}
        currentFile={currentFile}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        playbackSpeed={playbackSpeed}
        sleepTimerMinutes={sleepTimerMinutes}
        sleepTimerRemaining={sleepTimerRemaining}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        videoMode={videoMode}
        playlist={playlist}
        mediaRef={mediaRef}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onSkipSeconds={handleSkipSeconds}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onChangeSpeed={handleChangeSpeed}
        onSetSleepTimer={handleSetSleepTimer}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleVideoMode={handleToggleVideoMode}
        onToggleFavorite={handleToggleFavorite}
        onSelectTrack={handlePlay}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onTestConnection={handleTestConnection}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadData}
        onEnqueueFiles={handleEnqueueFiles}
      />
    </div>
  );
}
