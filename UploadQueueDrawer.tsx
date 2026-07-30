import React from 'react';
import { Upload, X, Play, Pause, RotateCw, CheckCircle2, AlertCircle, Trash2, Layers } from 'lucide-react';
import { UploadQueueItem } from '../types';

interface UploadQueueDrawerProps {
  queue: UploadQueueItem[];
  isOpen: boolean;
  onClose: () => void;
  onPauseItem: (id: string) => void;
  onResumeItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onCancelItem: (id: string) => void;
  onClearCompleted: () => void;
}

export const UploadQueueDrawer: React.FC<UploadQueueDrawerProps> = ({
  queue,
  isOpen,
  onClose,
  onPauseItem,
  onResumeItem,
  onRetryItem,
  onCancelItem,
  onClearCompleted
}) => {
  if (!isOpen || queue.length === 0) return null;

  const activeCount = queue.filter(i => i.status === 'uploading' || i.status === 'queued').length;
  const successCount = queue.filter(i => i.status === 'success').length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 md:w-96 glass-panel rounded-3xl p-4 shadow-2xl border border-white/10 space-y-3 select-none backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Upload Queue</h4>
            <p className="text-[10px] text-slate-400">
              {activeCount > 0 ? `${activeCount} uploading...` : `${successCount} completed`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {successCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 px-2"
              title="Clear completed uploads"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Done</span>
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Items */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {queue.map((item) => (
          <div key={item.id} className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-white truncate" title={item.file.name}>
                  {item.title || item.file.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatSize(item.file.size)} • {item.status.toUpperCase()}
                </p>
              </div>

              {/* Status Action Controls */}
              <div className="flex items-center gap-1">
                {item.status === 'uploading' && (
                  <button
                    onClick={() => onPauseItem(item.id)}
                    className="p-1 rounded-lg bg-white/10 text-slate-300 hover:text-white"
                    title="Pause"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                )}

                {item.status === 'paused' && (
                  <button
                    onClick={() => onResumeItem(item.id)}
                    className="p-1 rounded-lg bg-blue-600 text-white"
                    title="Resume"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}

                {item.status === 'error' && (
                  <button
                    onClick={() => onRetryItem(item.id)}
                    className="p-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                    title="Retry"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                )}

                {item.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}

                {item.status !== 'success' && (
                  <button
                    onClick={() => onCancelItem(item.id)}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {(item.status === 'uploading' || item.status === 'paused') && (
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${item.status === 'paused' ? 'bg-amber-400' : 'bg-blue-500'}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}

            {item.errorMsg && (
              <p className="text-[10px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{item.errorMsg}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
