import { useEffect, useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
} from "@/components/ui/pagination";
import {
  Video as VideoIcon,
  Loader2,
  MoreHorizontal,
  Trash2,
  X,
  ListMusic,
  Plus,
  Tags,
} from "lucide-react";
import { type Video } from "@/lib/api-types";
import { VideoCard } from "./video-card";
import { usePlaylist } from "@/hooks/use-playlist";
import { useTags } from "@/hooks/use-tags";
import { TagSelector } from "@/components/tags/tag-selector";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Playlist } from "@/lib/types";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<number>>(
    new Set(),
  );
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [isBulkTagDialogOpen, setIsBulkTagDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const playlist = usePlaylist();
  const playlists = playlist.list;
  const tags = useTags();

  const openCreateDialog = (videoId?: number) => {
    if (videoId !== undefined) {
      setSelectedVideoId(videoId);
    }
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setNewPlaylistName("");
    setSelectedVideoId(null);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    playlist.create(newPlaylistName.trim());
    setIsCreateDialogOpen(false);
    setNewPlaylistName("");

    // If videos were selected in bulk mode, add them to the new playlist
    if (isSelectMode && selectedVideoIds.size > 0) {
      const videoIds = Array.from(selectedVideoIds);
      playlist.bulkAddVideos(newPlaylistName.trim(), videoIds);
      setIsSelectMode(false);
      setSelectedVideoIds(new Set());
      setIsBulkAddDialogOpen(false);
    } else if (selectedVideoId !== null) {
      // If a single video was selected, add it to the new playlist
      playlist.addVideo(newPlaylistName.trim(), selectedVideoId);
      setSelectedVideoId(null);
    }
  };

  const addToPlaylist = (playlistName: string, videoId: number) => {
    playlist.addVideo(playlistName, videoId);
  };

  const bulkAddToPlaylist = (playlistName: string) => {
    const videoIds = Array.from(selectedVideoIds);
    playlist.bulkAddVideos(playlistName, videoIds);
    setIsSelectMode(false);
    setSelectedVideoIds(new Set());
    setIsBulkAddDialogOpen(false);
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
    if (
      confirm(`Are you sure you want to delete ${idsToDelete.length} video(s)?`)
    ) {
      playlist.deleteVideos(idsToDelete);
      setIsSelectMode(false);
      setSelectedVideoIds(new Set());
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const openBulkAddDialog = () => setIsBulkAddDialogOpen(true);
  const closeBulkAddDialog = () => setIsBulkAddDialogOpen(false);
  const openBulkTagDialog = () => {
    setSelectedTagIds([]);
    setIsBulkTagDialogOpen(true);
  };
  const closeBulkTagDialog = () => setIsBulkTagDialogOpen(false);

  const handleBulkTagAssign = () => {
    if (selectedTagIds.length === 0) {
      toast.error("Please select at least one tag");
      return;
    }
    const videoIds = Array.from(selectedVideoIds);
    tags.assignTags({ videoIds, tagIds: selectedTagIds });
    setIsBulkTagDialogOpen(false);
    setSelectedTagIds([]);
  };

  // Calculate pagination
  const totalPages = Math.ceil(videos.length / itemsPerPage);
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return videos.slice(startIndex, endIndex);
  }, [videos, currentPage, itemsPerPage]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Reset to page 1 when videos change (e.g., filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [videos.length]);

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

  const deleteVideoClick = (
    e: React.MouseEvent,
    videoId: number,
    title: string,
  ) => {
    e.stopPropagation();
    if (onRemoveVideo) {
      // Remove from playlist mode - removeVideo already has confirmation built in
      onRemoveVideo(videoId, title);
    } else {
      // Global delete mode - deleteVideos already has confirmation built in
      deleteVideos([videoId]);
    }
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
                disabled={playlist.isBulkAdding}
                className="w-full justify-start font-normal"
              >
                <ListMusic className="mr-2 h-4 w-4" />
                Add to Playlist
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                variant="ghost"
                onClick={openBulkTagDialog}
                disabled={tags.isAssigning}
                className="w-full justify-start font-normal"
              >
                <Tags className="mr-2 h-4 w-4" />
                Assign Tags
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
                disabled={playlist.isDeletingVideos}
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
  }, [
    isSelectMode,
    selectedVideoIds.size,
    playlist.isBulkAdding,
    playlist.isDeletingVideos,
    tags.isAssigning,
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
        {paginatedVideos.map((video) => {
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
              onDeleteVideo={deleteVideoClick}
              isAddingToPlaylist={playlist.isAddingVideo}
            />
          );
        })}
      </div>

      <span className="text-sm text-muted-foreground text-nowrap flex mt-6">
        {videos.length} result{videos.length !== 1 ? "s" : ""}
      </span>
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground text-nowrap">
              Rows per page:
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Pagination>
            <PaginationContent className="w-full">
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationFirst
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(1);
                    }}
                    className="cursor-pointer"
                    href="#"
                  />
                </PaginationItem>
              )}

              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                    }}
                    className="cursor-pointer"
                    href="#"
                  />
                </PaginationItem>
              )}

              <div className="flex grow w-full" />

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                    className="cursor-pointer"
                    href="#"
                  />
                </PaginationItem>
              )}

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLast
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(totalPages);
                    }}
                    className="cursor-pointer"
                    href="#"
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}

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
                    handleCreatePlaylist();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeCreateDialog}
              disabled={playlist.isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={playlist.isCreating}
            >
              {playlist.isCreating ? (
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
                      disabled={playlist.isBulkAdding}
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
              disabled={playlist.isBulkAdding}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkTagDialogOpen} onOpenChange={closeBulkTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tags to Videos</DialogTitle>
            <DialogDescription>
              Assign tags to {selectedVideoIds.size} video
              {selectedVideoIds.size !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Tags</Label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onSelectionChange={setSelectedTagIds}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeBulkTagDialog}
              disabled={tags.isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkTagAssign}
              disabled={selectedTagIds.length === 0 || tags.isAssigning}
            >
              {tags.isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Tags"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
