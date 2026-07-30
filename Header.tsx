import React from 'react';
import { Search, RefreshCw, Settings, Upload, Menu, Wifi, WifiOff, Sun, Moon, Layers } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSettings: () => void;
  onOpenUpload: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onMobileMenuToggle?: () => void;
  isOffline?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  queueCount?: number;
  onOpenQueue?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenSettings,
  onOpenUpload,
  onSync,
  isSyncing,
  onMobileMenuToggle,
  isOffline = false,
  theme = 'dark',
  onToggleTheme,
  queueCount = 0,
  onOpenQueue
}) => {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 z-10 select-none">
      {/* Title & Mobile Nav Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 rounded-xl glass-panel text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Personal Media Server
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Streaming & Cloud Storage via Private Telegram Channel
            </p>
          </div>
        </div>

        {/* Mobile Upload Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenUpload}
            className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Controls: Search, Sync, Theme, Queue, Offline Indicator & Settings */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files, songs, videos..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Queue Drawer Toggle */}
        {onOpenQueue && queueCount > 0 && (
          <button
            onClick={onOpenQueue}
            className="relative p-2.5 rounded-xl glass-panel text-blue-400 hover:bg-white/10 transition-all cursor-pointer"
            title="Upload Queue"
          >
            <Layers className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-[10px] text-white font-bold">
              {queueCount}
            </span>
          </button>
        )}

        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
        )}

        {/* Manual Rescan / Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl glass-panel text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          title="Manual Channel Rescan"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          <span>Rescan</span>
        </button>

        {/* Offline Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium ${
            isOffline
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}
          title={isOffline ? 'Operating in Offline Mode (Cached Files)' : 'Online - Synced with Cloud'}
        >
          {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span className="hidden lg:inline">{isOffline ? 'Offline Mode' : 'Online'}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          title="Telegram Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
