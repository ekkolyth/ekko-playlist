import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  removeVideoFromPlaylist,
  type PlaylistDetail,
} from '@/lib/api-client';
import { Play, Trash2, Edit2, Loader2, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/playlists/$id')({
  component: PlaylistDetailPage,
});

// Helper function to get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Helper function to get YouTube channel profile photo URL
function getChannelProfilePhoto(channel: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=e11d48&color=fff&size=128&bold=true`;
}

function PlaylistDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const playlistId = parseInt(id, 10);
  if (isNaN(playlistId)) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-destructive'>Invalid playlist ID</div>
      </div>
    );
  }

  const { data: playlist, isLoading, error } = useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: () => getPlaylist(playlistId),
  });

  const updateMutation = useMutation({
    mutationFn: (name: string) => updatePlaylist(playlistId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsEditingName(false);
      toast.success('Playlist updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update playlist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted successfully');
      navigate({ to: '/playlists' });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete playlist');
    },
  });

  const removeVideoMutation = useMutation({
    mutationFn: (videoId: number) => removeVideoFromPlaylist(playlistId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Video removed from playlist');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove video');
    },
  });

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
        <div className='text-muted-foreground text-sm text-center max-w-2xl'>
          {error.message}
        </div>
        <Button variant='outline' onClick={() => navigate({ to: '/playlists' })}>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Playlists
        </Button>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-muted-foreground'>Playlist not found</div>
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

        {playlist.videos.length === 0 && (
          <Empty className='py-16'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Play className='size-8' />
              </EmptyMedia>
              <EmptyTitle>No videos in this playlist</EmptyTitle>
              <EmptyDescription>
                Add videos from the dashboard to get started.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {playlist.videos.length > 0 && (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {playlist.videos.map((video) => (
              <Card
                key={video.id}
                className='group cursor-pointer border-border hover:border-primary/50 transition-colors overflow-hidden'
              >
                <div className='relative aspect-video bg-muted overflow-hidden'>
                  <img
                    src={getYouTubeThumbnail(video.videoId)}
                    alt={video.title}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('hqdefault')) {
                        target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                      }
                    }}
                  />
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center'>
                    <div className='opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                      <div className='bg-background rounded-full p-2.5 border border-border shadow-sm'>
                        <Play className='size-5 text-foreground fill-foreground' />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant='destructive'
                    size='icon'
                    className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveVideo(video.id, video.title);
                    }}
                    disabled={removeVideoMutation.isPending}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
                <CardContent className='p-4'>
                  <h3
                    className='font-medium text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors cursor-pointer'
                    onClick={() => window.open(video.normalizedUrl, '_blank')}
                  >
                    {video.title}
                  </h3>
                  <div className='flex items-center gap-2'>
                    <Avatar className='size-6'>
                      <AvatarImage
                        src={getChannelProfilePhoto(video.channel)}
                        alt={video.channel}
                      />
                      <AvatarFallback className='bg-primary text-primary-foreground text-[10px]'>
                        {video.channel
                          .split(' ')
                          .slice(0, 2)
                          .map((word) => word[0]?.toUpperCase() || '')
                          .join('')
                          .slice(0, 2) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className='text-xs text-muted-foreground truncate'>
                      {video.channel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Playlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{playlist.name}"? This will remove all videos from the playlist. This action cannot be undone.
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

