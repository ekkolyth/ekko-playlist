import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Edit2, Loader2, ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoCollection } from "../../-components/video-collection";
import {
  usePlaylist,
  decodeSlug,
  createSlug,
} from "@/hooks/use-playlist";
import { assertDefined } from "@/lib/assert";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/app/playlists/$name/")({
  component: PlaylistDetailPage,
});

function PlaylistDetailPage() {
  const { name: nameSlug } = Route.useParams();
  const navigate = useNavigate();
  const [selectModeActions, setSelectModeActions] =
    useState<React.ReactNode>(null);

  // Decode the playlist name from the URL
  const playlistName = decodeSlug(nameSlug);
  const playlist = usePlaylist();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: playlistDetail, isLoading, error } = useQuery({
    queryKey: ["playlist", playlistName],
    queryFn: () => playlist.get(playlistName),
    enabled: !!playlistName,
  });

  const startEdit = () => {
    if (playlistDetail) {
      setEditedName(playlistDetail.name);
      setIsEditingName(true);
    }
  };

  const saveEdit = () => {
    if (!editedName.trim()) {
      toast.error("Playlist name cannot be empty");
      return;
    }
    playlist.update(playlistName, editedName.trim());
    setIsEditingName(false);
    setEditedName("");
    navigate({
      to: "/app/playlists/$name",
      params: { name: createSlug(editedName.trim()) },
    });
  };

  const cancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleDeletePlaylist = () => {
    playlist.delete(playlistName);
    navigate({ to: "/app/playlists" });
  };

  const removeVideo = (videoId: number, title: string) => {
    if (!confirm(`Remove "${title}" from this playlist?`)) {
      return;
    }
    playlist.removeVideo(playlistName, videoId);
  };

  const openDeleteDialog = () => setIsDeleteDialogOpen(true);
  const closeDeleteDialog = () => setIsDeleteDialogOpen(false);

  const videoClick = (video: { id: number; normalizedUrl: string }) => {
    window.open(video.normalizedUrl, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-2">
        <div className="text-destructive font-medium">
          Error loading playlist
        </div>
        <div className="text-muted-foreground text-sm text-center max-w-2xl">
          {error.message}
        </div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/app/playlists" })}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Playlists
        </Button>
      </div>
    );
  }

  if (!playlistDetail && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Playlist not found</div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/app/playlists" })}
          className="ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Playlists
        </Button>
      </div>
    );
  }

  // assert my invariant
  assertDefined(playlistDetail);

  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate({ to: "/app/playlists" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Playlists
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveEdit();
                      } else if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                    className="text-3xl font-semibold h-auto"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={saveEdit}
                    disabled={playlist.isUpdating}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={cancelEdit}
                    disabled={playlist.isUpdating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">
                    {playlistDetail.name}
                  </h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={startEdit}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground mt-1">
                {playlistDetail.videos.length}{" "}
                {playlistDetail.videos.length === 1 ? "video" : "videos"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectModeActions}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={openDeleteDialog}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Playlist</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        <VideoCollection
          videos={playlistDetail.videos}
          isLoading={false}
          error={null}
          emptyTitle="No videos in this playlist"
          emptyDescription="Add videos from the dashboard to get started."
          onVideoClick={videoClick}
          onRemoveVideo={removeVideo}
          onSelectModeActionsChange={setSelectModeActions}
        />

        <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Playlist</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{playlistDetail.name}"? This will
                remove all videos from the playlist. This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={playlist.isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeletePlaylist}
                disabled={playlist.isDeleting}
              >
                {playlist.isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


