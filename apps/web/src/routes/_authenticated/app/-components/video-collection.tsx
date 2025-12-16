import { useEffect } from "react";
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
  Video as VideoIcon,
  Loader2,
  MoreHorizontal,
  Trash2,
  X,
  ListMusic,
  Plus,
} from "lucide-react";
import { type Video } from "@/lib/api-client";
import { VideoCard } from "./video-card";
import { usePlaylistVideos } from "@/hooks/use-playlist";

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
  onRemoveVideo?: (videoId: number, title: string) => void;
}

export function VideoCollection({
  videos,
  isLoading = false,
  error = null,
  emptyTitle = "No videos yet",
  emptyDescription = "Your playlist is empty. Start adding YouTube videos to build your collection!",
  onVideoClick,
  onSelectModeActionsChange,
  onRemoveVideo,
}: VideoCollectionProps) {
  const {
    playlists,
    isCreateDialogOpen,
    newPlaylistName,
    setNewPlaylistName,
    openCreateDialog,
    closeCreateDialog,
    isSelectMode,
    selectedVideoIds,
    toggleVideoSelection,
    deselectAll,
    isBulkAddDialogOpen,
    openBulkAddDialog,
    closeBulkAddDialog,
    createPlaylist,
    addToPlaylist,
    bulkAddToPlaylist,
    deleteVideos,
    copyLink,
    isCreating,
    isAddingToPlaylist,
    isBulkAdding,
    isDeleting,
  } = usePlaylistVideos();

  const shareClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    copyLink(url);
  };

  const selectPlaylist = (
    e: React.MouseEvent,
    playlistName: string,
    videoId: number,
  ) => {
    e.stopPropagation();
    addToPlaylist(playlistName, videoId);
  };

  const addToPlaylistClick = (e: React.MouseEvent, videoId: number) => {
    e.stopPropagation();
    openCreateDialog(videoId);
  };

  const videoClick = (video: Video) => {
    if (isSelectMode) {
      const isSelected = selectedVideoIds.has(video.id);
      toggleVideoSelection(video.id, !isSelected);
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
          onClick={deselectAll}
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
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                onClick={openBulkAddDialog}
                disabled={isBulkAdding}
                className="w-full justify-start font-normal"
              >
                <ListMusic className="mr-2 h-4 w-4" />
                Add to Playlist
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                onClick={() => {
                  if (onRemoveVideo) {
                    // Remove from playlist mode
                    const videoIds = Array.from(selectedVideoIds);
                    if (videoIds.length === 0) return;
                    if (
                      confirm(
                        `Remove ${videoIds.length} video(s) from this playlist?`,
                      )
                    ) {
                      videoIds.forEach((id) => {
                        const video = videos.find((v) => v.id === id);
                        if (video) {
                          onRemoveVideo(id, video.title);
                        }
                      });
                      deselectAll();
                    }
                  } else {
                    // Global delete mode
                    deleteVideos();
                  }
                }}
                disabled={isDeleting}
                className="w-full justify-start font-normal text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {onRemoveVideo ? "Remove from Playlist" : "Delete Videos"}
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
    onSelectModeActionsChange(actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectMode, selectedVideoIds.size, isBulkAdding, isDeleting]);

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
            <VideoCard
              key={video.id}
              video={video}
              isSelected={isSelected}
              isSelectMode={isSelectMode}
              playlists={playlists}
              onVideoClick={videoClick}
              onToggleSelection={toggleVideoSelection}
              onShareClick={shareClick}
              onAddToPlaylist={selectPlaylist}
              onCreatePlaylist={addToPlaylistClick}
              isAddingToPlaylist={isAddingToPlaylist}
            />
          );
        })}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={closeCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Give your playlist a name to get started.
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
                    createPlaylist();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeCreateDialog}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={createPlaylist} disabled={isCreating}>
              {isCreating ? (
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

      <Dialog open={isBulkAddDialogOpen} onOpenChange={closeBulkAddDialog}>
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
              <div className="space-y-2 max-h-75 overflow-y-auto">
                {playlists && playlists.length > 0 ? (
                  playlists.map((playlist) => (
                    <Button
                      key={playlist.name}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => bulkAddToPlaylist(playlist.name)}
                      disabled={isBulkAdding}
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
                  closeBulkAddDialog();
                  openCreateDialog();
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
              onClick={closeBulkAddDialog}
              disabled={isBulkAdding}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
