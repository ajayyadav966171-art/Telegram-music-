import React, { useRef, useEffect } from 'react';
import { X, Download, Film } from 'lucide-react';
import { MediaFile } from '../types';

interface VideoModalProps {
  file: MediaFile | null;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ file, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!file || !videoRef.current) return;

    // Pause all other media elements in the DOM before playing new video
    document.querySelectorAll('audio, video').forEach((el) => {
      if (el !== videoRef.current) {
        (el as HTMLMediaElement).pause();
      }
    });

    const targetSrc = `/api/media/stream/${file.id}`;
    if (!videoRef.current.src.endsWith(targetSrc)) {
      videoRef.current.src = targetSrc;
      videoRef.current.load();

      if (file.playbackPosition && file.playbackPosition > 0) {
        videoRef.current.currentTime = file.playbackPosition;
      }
    }

    let isCancelled = false;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (!isCancelled) console.log('Video autoplay handled:', err);
      });
    }

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: file.title || file.fileName,
          artist: file.artist || 'TeleCloud Video',
          album: 'TeleCloud Pro',
        });
        navigator.mediaSession.setActionHandler('play', () => {
          videoRef.current?.play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          videoRef.current?.pause();
        });
      } catch (e) {}
    }

    return () => {
      isCancelled = true;
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
        } catch (e) {}
      }
    };
  }, [file?.id]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl select-none">
      <div className="w-full max-w-5xl glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col space-y-3 p-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2 truncate">
            <Film className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <h3 className="text-sm md:text-base font-bold text-white truncate">
              {file.title || file.fileName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/media/stream/${file.id}`}
              download={file.fileName}
              className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white"
              title="Download Video"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Box */}
        <div className="w-full bg-black rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center shadow-2xl">
          <video
            ref={videoRef}
            controls
            className="w-full h-full object-contain"
          />
        </div>

        {/* Caption */}
        {file.caption && (
          <p className="text-xs text-slate-400 px-2 pt-1">
            {file.caption}
          </p>
        )}
      </div>
    </div>
  );
};
