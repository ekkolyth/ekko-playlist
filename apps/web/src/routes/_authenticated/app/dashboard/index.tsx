import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { VideosResponse, UserProfile } from "@/lib/api-types";
import { ChannelFilter } from "../-components/channel-filter";
import { VideoCollection } from "../-components/video-collection";

async function fetchVideos(
  selectedChannels?: string[],
): Promise<VideosResponse> {
  let url = "/api/videos";
  if (selectedChannels && selectedChannels.length > 0) {
    const channelsParam = selectedChannels.map(encodeURIComponent).join(",");
    url += `?channels=${channelsParam}`;
  }
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Failed to fetch videos");
  }
  return res.json();
}

async function fetchAllVideos(): Promise<VideosResponse> {
  const res = await fetch("/api/videos", { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Failed to fetch videos");
  }
  return res.json();
}

async function getUserProfile(): Promise<UserProfile> {
  const res = await fetch("/api/user/profile", { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Failed to fetch profile");
  }
  return res.json();
}

export const Route = createFileRoute("/_authenticated/app/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectModeActions, setSelectModeActions] =
    useState<React.ReactNode>(null);

  // Fetch user profile for display name
  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  // Fetch all videos to get the list of available channels
  const { data: allVideosData } = useQuery({
    queryKey: ["videos", "all"],
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
    queryKey: ["videos", selectedChannels],
    queryFn: () => fetchVideos(selectedChannels),
  });

  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-1">
                Welcome back, {profile?.name?.trim() || user?.email || "User"}
              </h1>
              <p className="text-muted-foreground">All YouTube videos</p>
            </div>
            <div className="flex items-center gap-2">
              {selectModeActions}
              {availableChannels.length > 0 && (
                <ChannelFilter
                  channels={availableChannels}
                  selectedChannels={selectedChannels}
                  onSelectionChange={setSelectedChannels}
                />
              )}
            </div>
          </div>
        </div>

        <VideoCollection
          videos={data?.videos || []}
          isLoading={isLoading}
          error={error}
          emptyTitle={
            selectedChannels.length > 0
              ? "No videos match your filters"
              : "No videos yet"
          }
          emptyDescription={
            selectedChannels.length > 0
              ? "Try adjusting your channel filters to see more videos."
              : "Your playlist is empty. Start adding YouTube videos to build your collection!"
          }
          showChannelFilter={false}
          onSelectModeActionsChange={setSelectModeActions}
        />
      </div>
    </div>
  );
}
