import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Link as LinkIcon, Plus, ListMusic, Trash2 } from "lucide-react";
import type { Video, Playlist } from "@/lib/api-types";
import { getYouTubeThumbnail } from "@/hooks/use-playlist";

// Helper function to get YouTube channel profile photo URL
function getChannelProfilePhoto(channel: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=e11d48&color=fff&size=128&bold=true`;
}

interface VideoCardProps {
  video: Video;
  isSelected: boolean;
  isSelectMode: boolean;
  playlists?: Playlist[];
  onVideoClick: (video: Video) => void;
  onToggleSelection: (videoId: number, checked: boolean) => void;
  onShareClick: (e: React.MouseEvent, url: string) => void;
  onAddToPlaylist: (
    e: React.MouseEvent,
    playlistName: string,
    videoId: number,
  ) => void;
  onCreatePlaylist: (e: React.MouseEvent, videoId: number) => void;
  onDeleteVideo?: (e: React.MouseEvent, videoId: number, title: string) => void;
  isAddingToPlaylist?: boolean;
}

export function VideoCard({
  video,
  isSelected,
  isSelectMode,
  playlists = [],
  onVideoClick,
  onToggleSelection,
  onShareClick,
  onAddToPlaylist,
  onCreatePlaylist,
  onDeleteVideo,
  isAddingToPlaylist = false,
}: VideoCardProps) {
  return (
    <Card
      key={video.id}
      className={`py-0 gap-2 group cursor-pointer border-border hover:border-primary/50 transition-colors overflow-hidden relative ${
        isSelected ? "ring-2 ring-primary ring-offset-0" : ""
      }`}
      onClick={() => onVideoClick(video)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        <img
          src={getYouTubeThumbnail(video.videoId)}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Fallback to hqdefault if maxresdefault fails
            const target = e.target as HTMLImageElement;
            if (!target.src.includes("hqdefault")) {
              target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
            }
          }}
        />
        <div
          className={`absolute top-2 left-2 z-20 transition-opacity ${
            isSelectMode || isSelected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(video.id, !isSelected);
          }}
        >
          <div className="bg-background border border-border rounded-md shadow-md hover:border-primary hover:text-primary transition-colors size-8 flex items-center justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                onToggleSelection(video.id, checked === true);
              }}
            />
          </div>
        </div>
        {!isSelectMode && (
          <>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-background rounded-full p-2.5 border border-border shadow-sm group-hover:border-primary group-hover:text-primary transition-colors">
                  <Play className="size-5 fill-current" />
                </div>
              </div>
            </div>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              <Button
                size="icon-sm"
                variant="ghost"
                className="bg-background border border-border shadow-md hover:bg-background hover:border-primary hover:text-primary"
                onClick={(e) => onShareClick(e, video.normalizedUrl)}
                aria-label="Share video link"
              >
                <LinkIcon className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="bg-background border border-border shadow-md hover:bg-background hover:border-primary hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Add to playlist"
                  >
                    <ListMusic className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuLabel>Add to Playlist</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {playlists && playlists.length > 0 ? (
                    playlists.map((playlist) => (
                      <DropdownMenuItem
                        key={playlist.name}
                        onClick={(e) =>
                          onAddToPlaylist(e, playlist.name, video.id)
                        }
                        disabled={isAddingToPlaylist}
                      >
                        {playlist.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No playlists yet
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => onCreatePlaylist(e, video.id)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Playlist
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {onDeleteVideo && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="bg-background border border-border shadow-md hover:bg-background hover:border-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteVideo(e, video.id, video.title);
                  }}
                  aria-label="Delete video"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage
              src={getChannelProfilePhoto(video.channel)}
              alt={video.channel}
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
              {video.channel
                .split(" ")
                .slice(0, 2)
                .map((word) => word[0]?.toUpperCase() || "")
                .join("")
                .slice(0, 2) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {video.channel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
