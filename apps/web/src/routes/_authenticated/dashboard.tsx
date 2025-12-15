import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Play, Video, Link as LinkIcon, Plus, ListMusic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest, fetchPlaylists, createPlaylist, addVideoToPlaylist, type Playlist } from '@/lib/api-client';
import { ChannelFilter } from '@/components/channel-filter';

interface Video {
  id: number;
  videoId: string;
  normalizedUrl: string;
  originalUrl: string;
  title: string;
  channel: string;
  createdAt: string;
}

interface VideosResponse {
  videos: Video[];
}

// Helper function to get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Helper function to get YouTube channel profile photo URL
// Uses a simple avatar service with red accent color
function getChannelProfilePhoto(channel: string): string {
  // Use ui-avatars.com with the channel name, red background, white text
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=e11d48&color=fff&size=128&bold=true`;
}

async function fetchVideos(selectedChannels?: string[]): Promise<VideosResponse> {
  try {
    let url = '/api/videos';
    if (selectedChannels && selectedChannels.length > 0) {
      // Encode channels as comma-separated query parameter
      const channelsParam = selectedChannels.map(encodeURIComponent).join(',');
      url += `?channels=${channelsParam}`;
    }
    return await apiRequest<VideosResponse>(url);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';
      throw new Error(
        `Failed to connect to API at ${API_URL}. Make sure the API server is running.`
      );
    }
    throw error;
  }
}

async function fetchAllVideos(): Promise<VideosResponse> {
  try {
    return await apiRequest<VideosResponse>('/api/videos');
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';
      throw new Error(
        `Failed to connect to API at ${API_URL}. Make sure the API server is running.`
      );
    }
    throw error;
  }
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Fetch all videos to get the list of available channels
  const { data: allVideosData } = useQuery({
    queryKey: ['videos', 'all'],
    queryFn: fetchAllVideos,
  });

  // Extract unique channel names from all videos
  const availableChannels = useMemo(() => {
    if (!allVideosData?.videos) return [];
    const channels = new Set<string>();
    allVideosData.videos.forEach((video) => {
      if (video.channel) {
        channels.add(video.channel);
      }
    });
    return Array.from(channels);
  }, [allVideosData]);

  // Fetch filtered videos
  const { data, isLoading, error } = useQuery({
    queryKey: ['videos', selectedChannels],
    queryFn: () => fetchVideos(selectedChannels),
  });

  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: fetchPlaylists,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(name),
    onSuccess: async (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setIsCreateDialogOpen(false);
      setNewPlaylistName('');
      toast.success('Playlist created successfully');
      
      // If a video was selected, add it to the new playlist
      if (selectedVideoId !== null) {
        try {
          await addVideoToPlaylist(newPlaylist.id, selectedVideoId);
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
    mutationFn: ({ playlistId, videoId }: { playlistId: number; videoId: number }) =>
      addVideoToPlaylist(playlistId, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Video added to playlist');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add video to playlist');
    },
  });

  const handleShareClick = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleAddToPlaylist = (e: React.MouseEvent, videoId: number) => {
    e.stopPropagation();
    setSelectedVideoId(videoId);
    setIsCreateDialogOpen(true);
  };

  const handleSelectPlaylist = (e: React.MouseEvent, playlistId: number, videoId: number) => {
    e.stopPropagation();
    addToPlaylistMutation.mutate({ playlistId, videoId });
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }
    createPlaylistMutation.mutate(newPlaylistName.trim());
  };

  return (
    <div className='flex-1 p-6'>
      <div className='container mx-auto max-w-7xl'>
        <div className='mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-3xl font-semibold tracking-tight mb-1'>
                Welcome, {user?.email || 'User'}
              </h1>
              <p className='text-muted-foreground'>All YouTube videos</p>
            </div>
            {availableChannels.length > 0 && (
              <ChannelFilter
                channels={availableChannels}
                selectedChannels={selectedChannels}
                onSelectionChange={setSelectedChannels}
              />
            )}
          </div>
        </div>

        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <div className='text-muted-foreground'>Loading videos...</div>
          </div>
        )}

        {error && (
          <div className='flex flex-col items-center justify-center py-12 space-y-2'>
            <div className='text-destructive font-medium'>Error loading videos</div>
            <div className='text-muted-foreground text-sm text-center max-w-2xl'>
              {error.message}
            </div>
            <div className='text-muted-foreground text-xs mt-4'>
              Make sure the API server is running on{' '}
              {import.meta.env.VITE_API_URL || 'http://localhost:1337'}
            </div>
          </div>
        )}

        {data && data.videos.length === 0 && (
          <Empty className='py-16'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Video className='size-8' />
              </EmptyMedia>
              <EmptyTitle>
                {selectedChannels.length > 0
                  ? 'No videos match your filters'
                  : 'No videos yet'}
              </EmptyTitle>
              <EmptyDescription>
                {selectedChannels.length > 0
                  ? 'Try adjusting your channel filters to see more videos.'
                  : 'Your playlist is empty. Start adding YouTube videos to build your collection!'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {data && data.videos.length > 0 && (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {data.videos.map((video) => (
              <Card
                key={video.id}
                className='group cursor-pointer border-border hover:border-primary/50 transition-colors overflow-hidden relative'
                onClick={() => window.open(video.normalizedUrl, '_blank')}
              >
                <div className='relative aspect-video bg-muted overflow-hidden'>
                  <img
                    src={getYouTubeThumbnail(video.videoId)}
                    alt={video.title}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    onError={(e) => {
                      // Fallback to hqdefault if maxresdefault fails
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
                  <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10'>
                    <Button
                      size='icon-sm'
                      variant='ghost'
                      className='bg-background/90 hover:bg-background'
                      onClick={(e) => handleShareClick(e, video.normalizedUrl)}
                      aria-label='Share video link'
                    >
                      <LinkIcon className='size-4' />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size='icon-sm'
                          variant='ghost'
                          className='bg-background/90 hover:bg-background'
                          onClick={(e) => e.stopPropagation()}
                          aria-label='Add to playlist'
                        >
                          <ListMusic className='size-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuLabel>Add to Playlist</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {playlistsData?.playlists && playlistsData.playlists.length > 0 ? (
                          playlistsData.playlists.map((playlist) => (
                            <DropdownMenuItem
                              key={playlist.id}
                              onClick={(e) => handleSelectPlaylist(e, playlist.id, video.id)}
                              disabled={addToPlaylistMutation.isPending}
                            >
                              {playlist.name}
                            </DropdownMenuItem>
                          ))
                        ) : (
                          <DropdownMenuItem disabled>No playlists yet</DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleAddToPlaylist(e, video.id)}
                        >
                          <Plus className='mr-2 h-4 w-4' />
                          Create New Playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className='p-4'>
                  <h3 className='font-medium text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors'>
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

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription>
                {selectedVideoId !== null
                  ? 'Create a new playlist and add this video to it.'
                  : 'Give your playlist a name to get started.'}
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
                      handleCreatePlaylist();
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
                  setSelectedVideoId(null);
                }}
                disabled={createPlaylistMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlaylist}
                disabled={createPlaylistMutation.isPending}
              >
                {createPlaylistMutation.isPending ? (
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

