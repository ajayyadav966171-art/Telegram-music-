import React from 'react';
import { Database, HardDrive, Cpu, CheckCircle2, Trash2 } from 'lucide-react';
import { StorageStats } from '../types';

interface StatsGridProps {
  stats: StorageStats | null;
  onSync: () => void;
  onClearCache?: () => void;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, onSync, onClearCache }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6 z-10 select-none">
      {/* Total Storage Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Storage</span>
          <HardDrive className="w-4 h-4 text-blue-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {stats?.totalFormatted || '0.00 GB'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Telegram Infinite Channel</p>
        </div>
      </div>

      {/* File Count Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Indexed Files</span>
          <Database className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {stats?.totalFiles ?? 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">SQLite Index Registry</p>
        </div>
      </div>

      {/* Smart Cache Status Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Cache Usage</span>
          <Cpu className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {stats?.cacheFormatted || '0.0 MB'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats?.cachedCount || 0} items cached • Max {stats?.maxCacheSizeFormatted || '500 MB'}
            </p>
          </div>
          {onClearCache && (stats?.cacheBytes || 0) > 0 && (
            <button
              onClick={onClearCache}
              title="Clear Local Cache"
              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hover:border-white/20 transition-all">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Sync Status</span>
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {stats?.syncStatus || 'Connected'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            Last: {stats?.lastSyncTime || 'Just now'}
          </p>
        </div>
      </div>
    </div>
  );
};
