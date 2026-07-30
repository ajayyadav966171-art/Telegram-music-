export interface MediaFile {
  id: string;
  telegramMessageId: number;
  fileId: string;
  fileUniqueId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: 'music' | 'video' | 'document' | 'photo' | 'apk';
  caption: string;
  duration?: number;
  artist?: string;
  title?: string;
  album?: string;
  thumbnailUrl?: string;
  playbackPosition?: number;
  createdAt: string;
  isFavorite: boolean;
  downloadCount: number;
  localPath?: string;
  cachePath?: string;
  keepOffline?: boolean;
  isCached?: boolean;
  cacheStatus?: 'none' | 'caching' | 'cached' | 'error';
  cacheProgress?: number;
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  totalFormatted: string;
  cacheBytes: number;
  cacheFormatted: string;
  cachedCount: number;
  maxCacheSizeBytes?: number;
  maxCacheSizeFormatted?: string;
  pinnedCacheBytes?: number;
  pinnedCount?: number;
  categories: {
    music: number;
    video: number;
    document: number;
    photo: number;
    apk: number;
  };
  lastSyncTime: string;
  syncStatus: string;
}

export interface TelegramSettings {
  botToken: string;
  channelId: string;
  apiId: string;
  apiHash: string;
  phone: string;
  sessionString: string;
  syncIntervalMinutes: number;
  autoSyncEnabled: boolean;
  lastSyncedMsgId: number;
  lastSyncTime: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  fileIds: string[];
  createdAt: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  title: string;
  artist?: string;
  caption?: string;
  status: 'queued' | 'uploading' | 'paused' | 'success' | 'error' | 'cancelled';
  progress: number;
  errorMsg?: string;
}

