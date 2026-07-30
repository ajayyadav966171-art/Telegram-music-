import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Music, Play, Check } from 'lucide-react';
import { Playlist, MediaFile } from '../types';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: MediaFile[];
  playlists: Playlist[];
  onRefreshPlaylists: () => void;
  onPlayFile: (file: MediaFile) => void;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  files,
  playlists,
  onRefreshPlaylists,
  onPlayFile
}) => {
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState('from-blue-600 to-indigo-600');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const colorOptions = [
    'from-blue-600 to-indigo-600',
    'from-pink-600 to-rose-600',
    'from-purple-600 to-indigo-600',
    'from-emerald-600 to-teal-600',
    'from-amber-600 to-orange-600'
  ];

  useEffect(() => {
    if (playlists.length > 0 && !activePlaylist) {
      setActivePlaylist(playlists[0]);
    }
  }, [playlists]);

  useEffect(() => {
    if (activePlaylist) {
      setName(activePlaylist.name);
      setDescription(activePlaylist.description || '');
      setCoverColor(activePlaylist.coverColor || 'from-blue-600 to-indigo-600');
      setSelectedFileIds(activePlaylist.fileIds || []);
    }
  }, [activePlaylist]);

  if (!isOpen) return null;

  const musicFiles = files.filter(f => f.category === 'music' || f.category === 'video');

  const handleSavePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isCreating) {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, coverColor })
      });
      if (res.ok) {
        setIsCreating(false);
        onRefreshPlaylists();
      }
    } else if (isEditing && activePlaylist) {
      const res = await fetch(`/api/playlists/${activePlaylist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, coverColor, fileIds: selectedFileIds })
      });
      if (res.ok) {
        setIsEditing(false);
        onRefreshPlaylists();
      }
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setActivePlaylist(null);
      onRefreshPlaylists();
    }
  };

  const handleToggleFileInPlaylist = async (fileId: string) => {
    if (!activePlaylist) return;
    const exists = selectedFileIds.includes(fileId);
    const updated = exists
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];

    setSelectedFileIds(updated);

    await fetch(`/api/playlists/${activePlaylist.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: updated })
    });
    onRefreshPlaylists();
  };

  const playlistFiles = activePlaylist
    ? files.filter(f => (activePlaylist.fileIds || []).includes(f.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
              <Music className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Playlists & Collections</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {/* Playlist List Drawer */}
          <div className="border-r border-white/10 pr-3 space-y-2 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Playlists</span>
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsEditing(false);
                  setName('');
                  setDescription('');
                }}
                className="p-1 rounded-lg bg-blue-600 text-white text-xs flex items-center gap-1 px-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  setActivePlaylist(pl);
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                className={`p-3 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                  activePlaylist?.id === pl.id
                    ? 'bg-white/10 border-blue-500/50 text-white'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="truncate">
                  <h5 className="text-xs font-bold text-white truncate">{pl.name}</h5>
                  <p className="text-[10px] text-slate-400">{(pl.fileIds || []).length} tracks</p>
                </div>
              </div>
            ))}

            {playlists.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No playlists created yet.</p>
            )}
          </div>

          {/* Playlist Content View or Editor */}
          <div className="md:col-span-2 flex flex-col overflow-y-auto pl-1 space-y-3">
            {isCreating || isEditing ? (
              <form onSubmit={handleSavePlaylist} className="space-y-3">
                <h4 className="text-sm font-bold text-white">{isCreating ? 'Create Playlist' : 'Edit Playlist'}</h4>

                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Playlist Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chill Vibes 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Cover Gradient</label>
                  <div className="flex items-center gap-2">
                    {colorOptions.map((c) => (
                      <div
                        key={c}
                        onClick={() => setCoverColor(c)}
                        className={`w-7 h-7 rounded-full bg-gradient-to-r ${c} cursor-pointer border-2 ${coverColor === c ? 'border-white' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold"
                  >
                    Save Playlist
                  </button>
                </div>
              </form>
            ) : activePlaylist ? (
              <div className="space-y-3">
                <div className={`p-4 rounded-2xl bg-gradient-to-r ${activePlaylist.coverColor || 'from-blue-600 to-indigo-600'} flex items-center justify-between text-white shadow-xl`}>
                  <div>
                    <h4 className="text-base font-bold">{activePlaylist.name}</h4>
                    <p className="text-xs text-white/80">{activePlaylist.description || 'Custom Media Playlist'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white"
                      title="Edit Playlist"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlaylist(activePlaylist.id)}
                      className="p-1.5 rounded-xl bg-black/20 hover:bg-rose-500/40 text-white"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* File checklist */}
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Manage Tracks in Playlist
                  </span>
                  {musicFiles.map((file) => {
                    const isAdded = (selectedFileIds || []).includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleFileInPlaylist(file.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isAdded
                            ? 'bg-blue-500/10 border-blue-500/30 text-white'
                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayFile(file);
                            }}
                            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                          >
                            <Play className="w-3 h-3 fill-white" />
                          </button>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-white truncate">{file.title || file.fileName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{file.artist || 'Audio Track'}</p>
                          </div>
                        </div>

                        <div className={`p-1 rounded-lg ${isAdded ? 'bg-blue-600 text-white' : 'border border-white/20 text-transparent'}`}>
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                Select or create a playlist to manage files.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
