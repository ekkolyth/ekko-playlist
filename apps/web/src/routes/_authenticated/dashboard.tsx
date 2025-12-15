import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Play, Video } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api-client';

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

async function fetchVideos(): Promise<VideosResponse> {
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
  const { data, isLoading, error } = useQuery({
    queryKey: ['videos'],
    queryFn: fetchVideos,
  });

  return (
    <div className='flex-1 p-6'>
      <div className='container mx-auto max-w-7xl'>
        <div className='mb-8'>
          <h1 className='text-3xl font-semibold tracking-tight mb-1'>
            Welcome, {user?.email || 'User'}
          </h1>
          <p className='text-muted-foreground'>All YouTube videos</p>
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
              <EmptyTitle>No videos yet</EmptyTitle>
              <EmptyDescription>
                Your playlist is empty. Start adding YouTube videos to build your collection!
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {data && data.videos.length > 0 && (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {data.videos.map((video) => (
              <Card
                key={video.id}
                className='group cursor-pointer border-border hover:border-primary/50 transition-colors overflow-hidden'
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
      </div>
    </div>
  );
}

