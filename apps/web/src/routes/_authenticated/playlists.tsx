import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuth } from '@/contexts/auth-context';
import {
  fetchPlaylists,
  createPlaylist,
  deletePlaylist,
  type Playlist,
} from '@/lib/api-client';
import { Plus, Music, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/playlists')({
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsCreateDialogOpen(false);
      setNewPlaylistName('');
      toast.success('Playlist created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create playlist');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlaylist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete playlist');
    },
  });

  const handleCreate = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    createMutation.mutate(newPlaylistName.trim());
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove all videos from the playlist.`)) {
      return;
    }
    deleteMutation.mutate(id);
  };

  return (
    <div className='flex-1 p-6'>
      <div className='container mx-auto max-w-7xl'>
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-semibold tracking-tight mb-1'>Playlists</h1>
            <p className='text-muted-foreground'>
              Organize your videos into playlists
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Create Playlist
          </Button>
        </div>

        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        )}

        {error && (
          <div className='flex flex-col items-center justify-center py-12 space-y-2'>
            <div className='text-destructive font-medium'>Error loading playlists</div>
            <div className='text-muted-foreground text-sm text-center max-w-2xl'>
              {error.message}
            </div>
          </div>
        )}

        {data && data.playlists.length === 0 && (
          <Empty className='py-16'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Music className='size-8' />
              </EmptyMedia>
              <EmptyTitle>No playlists yet</EmptyTitle>
              <EmptyDescription>
                Create your first playlist to start organizing your videos.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {data && data.playlists.length > 0 && (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {data.playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className='group cursor-pointer border-border hover:border-primary/50 transition-colors'
              >
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <CardTitle className='line-clamp-2'>{playlist.name}</CardTitle>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(playlist.id, playlist.name);
                      }}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                  <CardDescription>
                    {playlist.videoCount} {playlist.videoCount === 1 ? 'video' : 'videos'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={() => navigate({ to: '/playlists/$id', params: { id: playlist.id.toString() } })}
                  >
                    View Playlist
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription>
                Give your playlist a name to get started.
              </DialogDescription>
            </DialogHeader>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='playlist-name'>Playlist Name</Label>
                <Input
                  id='playlist-name'
                  placeholder='e.g., "My Favorite Videos"'
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreate();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setNewPlaylistName('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

