import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  UserPreferences,
  UpdateUserPreferencesRequest,
} from "@/lib/api-types";

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

export function usePreferences() {
  const queryClient = useQueryClient();

  // Query for user preferences
  const prefsQuery = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiFetch<UserPreferences>("/api/preferences"),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to update preferences
  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserPreferencesRequest) =>
      apiFetch<UserPreferences>("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast.success("Preferences updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update preferences");
    },
  });

  return {
    // Preferences data
    preferences: prefsQuery.data,
    isLoading: prefsQuery.isLoading,
    error: prefsQuery.error,

    // Methods
    updatePreferences: (data: UpdateUserPreferencesRequest) =>
      updateMutation.mutate(data),

    // Loading states
    isUpdating: updateMutation.isPending,
  };
}