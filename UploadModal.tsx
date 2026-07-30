import React, { useState } from 'react';
import { X, Upload, Files } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  onEnqueueFiles?: (files: File[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onEnqueueFiles
}) => {
  const [fileList, setFileList] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected: File[] = Array.from(e.target.files);
      setFileList(selected);
      if (selected.length === 1) {
        setTitle(selected[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected: File[] = Array.from(e.dataTransfer.files);
      setFileList(selected);
      if (selected.length === 1) {
        setTitle(selected[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fileList.length === 0) return;

    if (fileList.length > 1 && onEnqueueFiles) {
      onEnqueueFiles(fileList);
      setFileList([]);
      onClose();
      return;
    }

    const file = fileList[0];
    setUploading(true);
    setProgress(30);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('caption', caption);
    formData.append('artist', artist);
    formData.append('title', title || file.name);

    try {
      setProgress(70);
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setProgress(100);
        setTimeout(() => {
          setUploading(false);
          setFileList([]);
          setCaption('');
          setArtist('');
          setTitle('');
          onUploadSuccess();
          onClose();
        }, 500);
      } else {
        alert('Upload failed');
        setUploading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5 relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Upload to Telegram Cloud</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.05]"
          >
            <input
              type="file"
              id="file-input"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-input" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <Files className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {fileList.length > 0
                    ? `${fileList.length} file(s) selected`
                    : 'Click to browse or drop multiple files here'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports MP3, MP4, MKV, PDF, APK, JPG (Drag & Drop multiple files)
                </p>
              </div>
            </label>
          </div>

          {fileList.length === 1 && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Title / Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Artist / Author (Optional)
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g. Synthwave Artist or Author"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Caption / Description
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Optional Telegram post caption..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right">Uploading to Telegram...</p>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={fileList.length === 0 || uploading}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg cursor-pointer"
            >
              {uploading ? 'Uploading...' : fileList.length > 1 ? `Upload ${fileList.length} Files` : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
