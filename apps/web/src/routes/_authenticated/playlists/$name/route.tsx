import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  removeVideoFromPlaylist,
  fetchPlaylists,
} from '@/lib/api-client';
import { Trash2, Edit2, Loader2, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { VideoCollection } from '@/components/video-collection';
import { useMemo } from 'react';

// Helper function to create a URL-safe slug from playlist name
// Use simple URL encoding to preserve the exact name
function createSlug(name: string): string {
  return encodeURIComponent(name);
}

// Helper function to decode slug back to name
function decodeSlug(slug: string): string {
  return decodeURIComponent(slug);
}

export const Route = createFileRoute('/_authenticated/playlists/$name')({
  component: PlaylistDetailPage,
});

function PlaylistDetailPage() {
  const { name: nameSlug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Decode the playlist name from the URL
  const playlistName = decodeSlug(nameSlug);

  // Fetch playlist details using the name
  // When the route param changes, the queryKey changes, so React Query automatically fetches new data
  const {
    data: playlist,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['playlist', playlistName],
    queryFn: () => getPlaylist(playlistName),
    enabled: !!playlistName,
  });

  const updateMutation = useMutation({
    mutationFn: (newName: string) => {
      if (!playlist) throw new Error('Playlist not found');
      return updatePlaylist(playlist.name, newName);
    },
    onSuccess: (_, newName) => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistName] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditingName(false);
      toast.success('Playlist updated successfully');
      // Navigate to the new playlist name
      navigate({
        to: '/playlists/$name',
        params: { name: createSlug(newName) },
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update playlist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!playlist) throw new Error('Playlist not found');
      return deletePlaylist(playlist.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted successfully');
      navigate({ to: '/playlists/all' });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete playlist');
    },
  });

  const removeVideoMutation = useMutation({
    mutationFn: (videoId: number) => {
      if (!playlist) throw new Error('Playlist not found');
      return removeVideoFromPlaylist(playlist.name, videoId);
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

  const handleVideoClick = (video: { id: number; normalizedUrl: string }) => {
    // For playlist detail page, we want to allow removing videos
    // But clicking should still open the video
    window.open(video.normalizedUrl, '_blank');
  };

  const handleStartEdit = () => {
    if (playlist) {
      setEditedName(playlist.name);
      setIsEditingName(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editedName.trim()) {
      toast.error('Playlist name cannot be empty');
      return;
    }
    updateMutation.mutate(editedName.trim());
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleRemoveVideo = (videoId: number, title: string) => {
    if (!confirm(`Remove "${title}" from this playlist?`)) {
      return;
    }
    removeVideoMutation.mutate(videoId);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen space-y-2'>
        <div className='text-destructive font-medium'>Error loading playlist</div>
        <div className='text-muted-foreground text-sm text-center max-w-2xl'>{error.message}</div>
        <Button
          variant='outline'
          onClick={() => navigate({ to: '/playlists' })}
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Playlists
        </Button>
      </div>
    );
  }

  if (!playlist && !isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-muted-foreground'>Playlist not found</div>
        <Button
          variant='outline'
          onClick={() => navigate({ to: '/playlists' })}
          className='ml-4'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Playlists
        </Button>
      </div>
    );
  }

  return (
    <div className='flex-1 p-6'>
      <div className='container mx-auto max-w-7xl'>
        <div className='mb-8'>
          <Button
            variant='ghost'
            className='mb-4'
            onClick={() => navigate({ to: '/playlists' })}
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Playlists
          </Button>

          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              {isEditingName ? (
                <div className='flex items-center gap-2'>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEdit();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    className='text-3xl font-semibold h-auto'
                    autoFocus
                  />
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                  >
                    <Save className='h-4 w-4' />
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={handleCancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <h1 className='text-3xl font-semibold tracking-tight'>{playlist.name}</h1>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={handleStartEdit}
                    className='h-8 w-8'
                  >
                    <Edit2 className='h-4 w-4' />
                  </Button>
                </div>
              )}
              <p className='text-muted-foreground mt-1'>
                {playlist.videos.length} {playlist.videos.length === 1 ? 'video' : 'videos'}
              </p>
            </div>
            <Button
              variant='destructive'
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete Playlist
            </Button>
          </div>
        </div>

        <VideoCollection
          videos={playlist.videos}
          isLoading={false}
          error={null}
          emptyTitle='No videos in this playlist'
          emptyDescription='Add videos from the dashboard to get started.'
          onVideoClick={handleVideoClick}
        />

        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Playlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{playlist.name}"? This will remove all videos from
                the playlist. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
