import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Play,
  Video as VideoIcon,
  Link as LinkIcon,
  Plus,
  ListMusic,
  Loader2,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchPlaylists,
  createPlaylist,
  addVideoToPlaylist,
  bulkAddVideosToPlaylist,
  deleteVideos,
  type Playlist,
  type Video,
} from "@/lib/api-client";
import { Checkbox } from "@/components/ui/checkbox";

// Helper function to get YouTube thumbnail URL
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Helper function to get YouTube channel profile photo URL
function getChannelProfilePhoto(channel: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(channel)}&background=e11d48&color=fff&size=128&bold=true`;
}

interface VideoCollectionProps {
  videos: Video[];
  isLoading?: boolean;
  error?: Error | null;
  emptyTitle?: string;
  emptyDescription?: string;
  showChannelFilter?: boolean;
  availableChannels?: string[];
  selectedChannels?: string[];
  onChannelsChange?: (channels: string[]) => void;
  onVideoClick?: (video: Video) => void;
  onSelectModeActionsChange?: (actions: React.ReactNode | null) => void;
}

export function VideoCollection({
  videos,
  isLoading = false,
  error = null,
  emptyTitle = "No videos yet",
  emptyDescription = "Your playlist is empty. Start adding YouTube videos to build your collection!",
  showChannelFilter = false,
  availableChannels = [],
  selectedChannels = [],
  onChannelsChange,
  onVideoClick,
  onSelectModeActionsChange,
}: VideoCollectionProps) {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(
    new Set(),
  );
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);

  const { data: playlistsData } = useQuery({
    queryKey: ["playlists"],
    queryFn: fetchPlaylists,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(name),
    onSuccess: async (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setIsCreateDialogOpen(false);
      setNewPlaylistName("");
      toast.success("Playlist created successfully");

      // If videos were selected in bulk mode, add them to the new playlist
      if (isSelectMode && selectedVideoIds.size > 0) {
        try {
          const videoIds = Array.from(selectedVideoIds);
          await bulkAddVideosToPlaylist(newPlaylist.name, videoIds);
          toast.success(`${videoIds.length} video(s) added to playlist`);
          queryClient.invalidateQueries({ queryKey: ["playlists"] });
          queryClient.invalidateQueries({ queryKey: ["videos"] });
          setIsSelectMode(false);
          setSelectedVideoIds(new Set());
          setIsBulkAddDialogOpen(false);
        } catch (err) {
          toast.error("Failed to add videos to playlist");
        }
      } else if (selectedVideoId !== null) {
        // If a single video was selected, add it to the new playlist
        try {
          await addVideoToPlaylist(newPlaylist.name, selectedVideoId);
          toast.success("Video added to playlist");
          queryClient.invalidateQueries({ queryKey: ["playlists"] });
        } catch (err) {
          toast.error("Failed to add video to playlist");
        }
        setSelectedVideoId(null);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create playlist");
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: ({
      playlistName,
      videoId,
    }: {
      playlistName: string;
      videoId: number;
    }) => addVideoToPlaylist(playlistName, videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Video added to playlist");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add video to playlist");
    },
  });

  const bulkAddToPlaylistMutation = useMutation({
    mutationFn: ({
      playlistName,
      videoIds,
    }: {
      playlistName: string;
      videoIds: number[];
    }) => bulkAddVideosToPlaylist(playlistName, videoIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success(`${variables.videoIds.length} video(s) added to playlist`);
      setIsSelectMode(false);
      setSelectedVideoIds(new Set());
      setIsBulkAddDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add videos to playlist");
    },
  });

  const deleteVideosMutation = useMutation({
    mutationFn: (videoIds: number[]) => deleteVideos(videoIds),
    onSuccess: (_, videoIds) => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success(`${videoIds.length} video(s) deleted`);
      setIsSelectMode(false);
      setSelectedVideoIds(new Set());
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete videos");
    },
  });

  const handleShareClick = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleAddToPlaylist = (e: React.MouseEvent, videoId: number) => {
    e.stopPropagation();
    setSelectedVideoId(videoId);
    setIsCreateDialogOpen(true);
  };

  const handleSelectPlaylist = (
    e: React.MouseEvent,
    playlistName: string,
    videoId: number,
  ) => {
    e.stopPropagation();
    addToPlaylistMutation.mutate({ playlistName, videoId });
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    createPlaylistMutation.mutate(newPlaylistName.trim());
  };

  const handleToggleVideoSelection = (videoId: number, checked: boolean) => {
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

  const handleDeselectAll = () => {
    setSelectedVideoIds(new Set());
    setIsSelectMode(false);
  };

  const handleBulkAddToPlaylist = (playlistName: string) => {
    const videoIds = Array.from(selectedVideoIds);
    bulkAddToPlaylistMutation.mutate({ playlistName, videoIds });
  };

  const handleBulkDelete = () => {
    const videoIds = Array.from(selectedVideoIds);
    if (videoIds.length === 0) return;
    if (
      confirm(`Are you sure you want to delete ${videoIds.length} video(s)?`)
    ) {
      deleteVideosMutation.mutate(videoIds);
    }
  };

  const handleVideoClick = (video: Video) => {
    if (isSelectMode) {
      const isSelected = selectedVideoIds.has(video.id);
      handleToggleVideoSelection(video.id, !isSelected);
    } else {
      if (onVideoClick) {
        onVideoClick(video);
      } else {
        window.open(video.normalizedUrl, "_blank");
      }
    }
  };

  useEffect(() => {
    if (!onSelectModeActionsChange) return;

    if (!isSelectMode) {
      onSelectModeActionsChange(null);
      return;
    }

    const actions = (
      <>
        <span className="text-sm text-muted-foreground">
          {selectedVideoIds.size} video{selectedVideoIds.size !== 1 ? "s" : ""}{" "}
          selected
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleDeselectAll}
          aria-label="Cancel selection"
        >
          <X className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Bulk actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsBulkAddDialogOpen(true)}
              disabled={bulkAddToPlaylistMutation.isPending}
            >
              <ListMusic className="mr-2 h-4 w-4" />
              Add to Playlist
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleBulkDelete}
              disabled={deleteVideosMutation.isPending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Videos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
    onSelectModeActionsChange(actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSelectMode,
    selectedVideoIds.size,
    bulkAddToPlaylistMutation.isPending,
    deleteVideosMutation.isPending,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading videos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <div className="text-destructive font-medium">Error loading videos</div>
        <div className="text-muted-foreground text-sm text-center max-w-2xl">
          {error.message}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <VideoIcon className="size-8" />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => {
          const isSelected = selectedVideoIds.has(video.id);
          return (
            <Card
              key={video.id}
              className={`group cursor-pointer border-border hover:border-primary/50 transition-colors overflow-hidden relative ${
                isSelected ? "ring-2 ring-primary ring-offset-0" : ""
              }`}
              onClick={() => handleVideoClick(video)}
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
                    handleToggleVideoSelection(video.id, !isSelected);
                  }}
                >
                  <div className="bg-background border border-border rounded-md shadow-md hover:border-primary hover:text-primary transition-colors size-8 flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        handleToggleVideoSelection(video.id, checked === true);
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
                        onClick={(e) =>
                          handleShareClick(e, video.normalizedUrl)
                        }
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
                          {playlistsData?.playlists &&
                          playlistsData.playlists.length > 0 ? (
                            playlistsData.playlists.map((playlist) => (
                              <DropdownMenuItem
                                key={playlist.id}
                                onClick={(e) =>
                                  handleSelectPlaylist(
                                    e,
                                    playlist.name,
                                    video.id,
                                  )
                                }
                                disabled={addToPlaylistMutation.isPending}
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
                            onClick={(e) => handleAddToPlaylist(e, video.id)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Playlist
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        })}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              {selectedVideoId !== null
                ? "Create a new playlist and add this video to it."
                : "Give your playlist a name to get started."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                placeholder='e.g., "My Favorite Videos"'
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreatePlaylist();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewPlaylistName("");
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Videos to Playlist</DialogTitle>
            <DialogDescription>
              Add {selectedVideoIds.size} video
              {selectedVideoIds.size !== 1 ? "s" : ""} to a playlist.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Playlist</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {playlistsData?.playlists &&
                playlistsData.playlists.length > 0 ? (
                  playlistsData.playlists.map((playlist) => (
                    <Button
                      key={playlist.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleBulkAddToPlaylist(playlist.name)}
                      disabled={bulkAddToPlaylistMutation.isPending}
                    >
                      {playlist.name}
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No playlists yet
                  </div>
                )}
              </div>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsBulkAddDialogOpen(false);
                  setIsCreateDialogOpen(true);
                  setSelectedVideoId(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Playlist
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkAddDialogOpen(false)}
              disabled={bulkAddToPlaylistMutation.isPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
