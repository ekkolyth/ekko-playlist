import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchPlaylists,
  createPlaylist as apiCreatePlaylist,
  getPlaylist as apiGetPlaylist,
  updatePlaylist as apiUpdatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  addVideoToPlaylist as apiAddVideoToPlaylist,
  removeVideoFromPlaylist as apiRemoveVideoFromPlaylist,
  bulkAddVideosToPlaylist as apiBulkAddVideosToPlaylist,
  deleteVideos as apiDeleteVideos,
  type Playlist,
  type PlaylistDetail,
} from '@/lib/api-client';

// Helper function to create a URL-safe slug from playlist name
export function createSlug(name: string): string {
  return encodeURIComponent(name);
}

// Helper function to decode slug back to name
export function decodeSlug(slug: string): string {
  return decodeURIComponent(slug);
}

// Helper function to get YouTube thumbnail URL
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

interface UsePlaylistsOptions {
  onCreateSuccess?: (playlist: Playlist) => void;
  onDeleteSuccess?: () => void;
  onUpdateSuccess?: (newName: string) => void;
}

/**
 * Hook for managing playlists list
 */
export function usePlaylists(options: UsePlaylistsOptions = {}) {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const query = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiCreatePlaylist(name),
    onSuccess: (playlist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsCreateDialogOpen(false);
      setNewPlaylistName('');
      toast.success('Playlist created successfully');
      options.onCreateSuccess?.(playlist);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create playlist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => apiDeletePlaylist(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted successfully');
      options.onDeleteSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete playlist');
    },
  });

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    createMutation.mutate(newPlaylistName.trim());
  };

  const deletePlaylist = (name: string, confirmMessage?: string) => {
    const message =
      confirmMessage ||
      `Are you sure you want to delete "${name}"? This will remove all videos from the playlist.`;
    if (!confirm(message)) {
      return;
    }
    deleteMutation.mutate(name);
  };

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewPlaylistName('');
  };

  return {
    // Query state
    playlists: query.data?.playlists || [],
    isLoading: query.isLoading,
    error: query.error,

    // Dialog state
    isCreateDialogOpen,
    newPlaylistName,
    setNewPlaylistName,
    openCreateDialog,
    closeCreateDialog,

    // Mutations
    createPlaylist,
    deletePlaylist,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

interface UsePlaylistDetailOptions {
  playlistName: string;
  onUpdateSuccess?: (newName: string) => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook for managing a single playlist detail
 */
export function usePlaylistDetail(options: UsePlaylistDetailOptions) {
  const { playlistName, onUpdateSuccess, onDeleteSuccess } = options;
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ['playlist', playlistName],
    queryFn: () => apiGetPlaylist(playlistName),
    enabled: !!playlistName,
  });

  const updateMutation = useMutation({
    mutationFn: (newName: string) => {
      if (!query.data) throw new Error('Playlist not found');
      return apiUpdatePlaylist(query.data.name, newName);
    },
    onSuccess: (_, newName) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistName] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditingName(false);
      toast.success('Playlist updated successfully');
      onUpdateSuccess?.(newName);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update playlist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!query.data) throw new Error('Playlist not found');
      return apiDeletePlaylist(query.data.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted successfully');
      onDeleteSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete playlist');
    },
  });

  const removeVideoMutation = useMutation({
    mutationFn: (videoId: number) => {
      if (!query.data) throw new Error('Playlist not found');
      return apiRemoveVideoFromPlaylist(query.data.name, videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistName] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Video removed from playlist');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove video');
    },
  });

  const startEdit = () => {
    if (query.data) {
      setEditedName(query.data.name);
      setIsEditingName(true);
    }
  };

  const saveEdit = () => {
    if (!editedName.trim()) {
      toast.error('Playlist name cannot be empty');
      return;
    }
    updateMutation.mutate(editedName.trim());
  };

  const cancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const deletePlaylist = () => {
    deleteMutation.mutate();
  };

  const removeVideo = (videoId: number, title: string) => {
    if (!confirm(`Remove "${title}" from this playlist?`)) {
      return;
    }
    removeVideoMutation.mutate(videoId);
  };

  const openDeleteDialog = () => setIsDeleteDialogOpen(true);
  const closeDeleteDialog = () => setIsDeleteDialogOpen(false);

  return {
    // Query state
    playlist: query.data,
    isLoading: query.isLoading,
    error: query.error,

    // Edit state
    isEditingName,
    editedName,
    setEditedName,
    startEdit,
    saveEdit,
    cancelEdit,

    // Delete dialog state
    isDeleteDialogOpen,
    openDeleteDialog,
    closeDeleteDialog,

    // Mutations
    updatePlaylist: saveEdit,
    deletePlaylist,
    removeVideo,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRemovingVideo: removeVideoMutation.isPending,
  };
}

interface UsePlaylistVideosOptions {
  onAddSuccess?: () => void;
  onBulkAddSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook for managing video-playlist operations
 */
export function usePlaylistVideos(options: UsePlaylistVideosOptions = {}) {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(new Set());
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);

  // Fetch playlists for dropdowns
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => apiCreatePlaylist(name),
    onSuccess: async (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsCreateDialogOpen(false);
      setNewPlaylistName('');
      toast.success('Playlist created successfully');

      // If videos were selected in bulk mode, add them to the new playlist
      if (isSelectMode && selectedVideoIds.size > 0) {
        try {
          const videoIds = Array.from(selectedVideoIds);
          await apiBulkAddVideosToPlaylist(newPlaylist.name, videoIds);
          toast.success(`${videoIds.length} video(s) added to playlist`);
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
          queryClient.invalidateQueries({ queryKey: ['videos'] });
          setIsSelectMode(false);
          setSelectedVideoIds(new Set());
          setIsBulkAddDialogOpen(false);
        } catch (err) {
          toast.error('Failed to add videos to playlist');
        }
      } else if (selectedVideoId !== null) {
        // If a single video was selected, add it to the new playlist
        try {
          await apiAddVideoToPlaylist(newPlaylist.name, selectedVideoId);
          toast.success('Video added to playlist');
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        } catch (err) {
          toast.error('Failed to add video to playlist');
        }
        setSelectedVideoId(null);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create playlist');
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: ({ playlistName, videoId }: { playlistName: string; videoId: number }) =>
      apiAddVideoToPlaylist(playlistName, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Video added to playlist');
      options.onAddSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add video to playlist');
    },
  });

  const bulkAddToPlaylistMutation = useMutation({
    mutationFn: ({ playlistName, videoIds }: { playlistName: string; videoIds: number[] }) =>
      apiBulkAddVideosToPlaylist(playlistName, videoIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success(`${variables.videoIds.length} video(s) added to playlist`);
      setIsSelectMode(false);
      setSelectedVideoIds(new Set());
      setIsBulkAddDialogOpen(false);
      options.onBulkAddSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add videos to playlist');
    },
  });

  const deleteVideosMutation = useMutation({
    mutationFn: (videoIds: number[]) => apiDeleteVideos(videoIds),
    onSuccess: (_, videoIds) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success(`${videoIds.length} video(s) deleted`);
      setIsSelectMode(false);
      setSelectedVideoIds(new Set());
      options.onDeleteSuccess?.();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete videos');
    },
  });

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const openCreateDialog = (videoId?: number) => {
    if (videoId !== undefined) {
      setSelectedVideoId(videoId);
    }
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewPlaylistName('');
    setSelectedVideoId(null);
  };

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    createPlaylistMutation.mutate(newPlaylistName.trim());
  };

  const addToPlaylist = (playlistName: string, videoId: number) => {
    addToPlaylistMutation.mutate({ playlistName, videoId });
  };

  const bulkAddToPlaylist = (playlistName: string) => {
    const videoIds = Array.from(selectedVideoIds);
    bulkAddToPlaylistMutation.mutate({ playlistName, videoIds });
  };

  const toggleVideoSelection = (videoId: number, checked: boolean) => {
    const newSelected = new Set(selectedVideoIds);
    if (checked) {
      newSelected.add(videoId);
      setIsSelectMode(true);
    } else {
      newSelected.delete(videoId);
      if (newSelected.size === 0) {
        setIsSelectMode(false);
      }
    }
    setSelectedVideoIds(newSelected);
  };

  const deselectAll = () => {
    setSelectedVideoIds(new Set());
    setIsSelectMode(false);
  };

  const deleteVideos = (videoIds?: number[]) => {
    const idsToDelete = videoIds || Array.from(selectedVideoIds);
    if (idsToDelete.length === 0) return;
    if (confirm(`Are you sure you want to delete ${idsToDelete.length} video(s)?`)) {
      deleteVideosMutation.mutate(idsToDelete);
    }
  };

  const openBulkAddDialog = () => setIsBulkAddDialogOpen(true);
  const closeBulkAddDialog = () => setIsBulkAddDialogOpen(false);

  return {
    // Playlists data
    playlists: playlistsData?.playlists || [],

    // Create dialog state
    isCreateDialogOpen,
    newPlaylistName,
    setNewPlaylistName,
    openCreateDialog,
    closeCreateDialog,

    // Selection state
    isSelectMode,
    selectedVideoIds,
    toggleVideoSelection,
    deselectAll,

    // Bulk add dialog state
    isBulkAddDialogOpen,
    openBulkAddDialog,
    closeBulkAddDialog,

    // Actions
    createPlaylist,
    addToPlaylist,
    bulkAddToPlaylist,
    deleteVideos,
    copyLink,

    // Mutation states
    isCreating: createPlaylistMutation.isPending,
    isAddingToPlaylist: addToPlaylistMutation.isPending,
    isBulkAdding: bulkAddToPlaylistMutation.isPending,
    isDeleting: deleteVideosMutation.isPending,
  };
}
