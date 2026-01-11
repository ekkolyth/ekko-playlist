import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Playlist,
  PlaylistDetail,
  ListPlaylistsResponse,
} from "@/lib/api-types";

// Helper function to create a URL-safe slug from playlist name
export function createSlug(name: string): string {
  return encodeURIComponent(name);
}

// Helper function to decode slug back to name
export function decodeSlug(slug: string): string {
  return decodeURIComponent(slug);
}

// Helper function to get YouTube thumbnail URL
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Modern fetch helper with proper error handling
async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const error =
      (await res.json().catch(() => null))?.message ?? res.statusText;
    throw new Error(error);
  }

  return res.json();
}

export function usePlaylist() {
  const queryClient = useQueryClient();

  // List all playlists
  const listQuery = useQuery({
    queryKey: ["playlists"],
    queryFn: () => apiFetch<ListPlaylistsResponse>("/api/playlists"),
  });

  // Get single playlist (call this when needed, not auto-fetched)
  const getPlaylist = (name: string) =>
    apiFetch<PlaylistDetail>(
      `/api/playlists/${encodeURIComponent(name)}`,
    );

  // Create playlist mutation
  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<Playlist>("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist created successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create playlist");
    },
  });

  // Update playlist mutation
  const updateMutation = useMutation({
    mutationFn: ({ name, newName }: { name: string; newName: string }) =>
      apiFetch<Playlist>(`/api/playlists/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update playlist");
    },
  });

  // Delete playlist mutation
  const deleteMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<void>(`/api/playlists/${encodeURIComponent(name)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete playlist");
    },
  });

  // Add video to playlist mutation
  const addVideoMutation = useMutation({
    mutationFn: ({
      playlistName,
      videoId,
    }: {
      playlistName: string;
      videoId: number;
    }) =>
      apiFetch<void>(
        `/api/playlists/${encodeURIComponent(playlistName)}/videos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Video added to playlist");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to add video to playlist");
    },
  });

  // Remove video from playlist mutation
  const removeVideoMutation = useMutation({
    mutationFn: ({
      playlistName,
      videoId,
    }: {
      playlistName: string;
      videoId: number;
    }) =>
      apiFetch<void>(
        `/api/playlists/${encodeURIComponent(playlistName)}/videos/${videoId}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Video removed from playlist");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to remove video from playlist");
    },
  });

  // Bulk add videos mutation
  const bulkAddVideosMutation = useMutation({
    mutationFn: ({
      playlistName,
      videoIds,
    }: {
      playlistName: string;
      videoIds: number[];
    }) =>
      apiFetch<void>(
        `/api/playlists/${encodeURIComponent(playlistName)}/videos/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoIds }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Videos added to playlist");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to add videos to playlist");
    },
  });

  // Delete videos mutation
  const deleteVideosMutation = useMutation({
    mutationFn: (videoIds: number[]) =>
      apiFetch<void>("/api/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Videos deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete videos");
    },
  });

  return {
    // List data
    list: listQuery.data?.playlists ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,

    // Methods
    get: getPlaylist,
    create: (name: string) => createMutation.mutate(name),
    update: (name: string, newName: string) =>
      updateMutation.mutate({ name, newName }),
    delete: (name: string) => deleteMutation.mutate(name),
    addVideo: (playlistName: string, videoId: number) =>
      addVideoMutation.mutate({ playlistName, videoId }),
    removeVideo: (playlistName: string, videoId: number) =>
      removeVideoMutation.mutate({ playlistName, videoId }),
    bulkAddVideos: (playlistName: string, videoIds: number[]) =>
      bulkAddVideosMutation.mutate({ playlistName, videoIds }),
    deleteVideos: (videoIds: number[]) => deleteVideosMutation.mutate(videoIds),

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingVideo: addVideoMutation.isPending,
    isRemovingVideo: removeVideoMutation.isPending,
    isBulkAdding: bulkAddVideosMutation.isPending,
    isDeletingVideos: deleteVideosMutation.isPending,
  };
}
