import React from 'react';
import { Music, Video, FileText, Image, Box, Home, Settings, Radio, RefreshCw, Upload, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { TelegramSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: TelegramSettings | null;
  onOpenSettings: () => void;
  onOpenUpload: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  onOpenSettings,
  onOpenUpload,
  onSync,
  isSyncing
}) => {
  const navItems = [
    { id: 'all', label: 'All Files', icon: Home, count: null },
    { id: 'music', label: 'Music Library', icon: Music, color: 'text-pink-400' },
    { id: 'video', label: 'Video Vault', icon: Video, color: 'text-purple-400' },
    { id: 'playlists', label: 'Playlists', icon: Radio, color: 'text-cyan-400' },
    { id: 'offline', label: 'Offline Library', icon: ShieldCheck, color: 'text-emerald-400' },
    { id: 'document', label: 'Documents & PDFs', icon: FileText, color: 'text-blue-400' },
    { id: 'photo', label: 'Photos & Gallery', icon: Image, color: 'text-emerald-400' },
    { id: 'apk', label: 'APKs & Apps', icon: Box, color: 'text-amber-400' },
    { id: 'favorites', label: 'Favorites', icon: Heart, color: 'text-rose-400' },
  ];

  const isConfigured = Boolean(settings?.botToken && settings?.channelId);

  return (
    <aside className="w-64 flex-shrink-0 h-full flex flex-col glass-panel border-r border-white/10 p-5 z-20 select-none">
      {/* Brand Logo */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('all')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25">
            TP
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              TeleCloud <span className="text-xs px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold uppercase">Pro</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Telegram Cloud Storage</p>
          </div>
        </div>
      </div>

      {/* Quick Action Upload */}
      <button
        onClick={onOpenUpload}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] mb-6 cursor-pointer"
      >
        <Upload className="w-4 h-4" />
        <span>Upload File</span>
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Library
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white shadow-inner border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${item.color || (isActive ? 'text-blue-400' : 'text-slate-400')}`} />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Telegram Channel Live Sync Status Widget */}
      <div className="mt-auto pt-4 border-t border-white/10">
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-200">
                {isConfigured ? 'Channel Linked' : 'Not Configured'}
              </span>
            </div>
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Sync Channel Now"
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          <div className="text-[11px] text-slate-400 truncate">
            {isConfigured ? (settings?.channelId || 'Private Channel') : 'Connect Telegram Bot'}
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full text-left pt-1 flex items-center justify-between text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Telegram</span>
            </span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};
