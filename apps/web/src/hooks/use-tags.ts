import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Tag,
  ListTagsResponse,
  CreateTagRequest,
  UpdateTagRequest,
  AssignTagsRequest,
  UnassignTagsRequest,
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

export function useTags() {
  const queryClient = useQueryClient();

  // List all tags
  const listQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<ListTagsResponse>("/api/tags"),
  });

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateTagRequest) =>
      apiFetch<Tag>("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Tag created successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create tag");
    },
  });

  // Update tag mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTagRequest }) =>
      apiFetch<Tag>(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Tag updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update tag");
    },
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/tags/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Tag deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete tag");
    },
  });

  // Assign tags mutation
  const assignTagsMutation = useMutation({
    mutationFn: (data: AssignTagsRequest) =>
      apiFetch<void>("/api/tags/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Tags assigned successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to assign tags");
    },
  });

  // Unassign tags mutation
  const unassignTagsMutation = useMutation({
    mutationFn: (data: UnassignTagsRequest) =>
      apiFetch<void>("/api/tags/unassign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Tags unassigned successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to unassign tags");
    },
  });

  return {
    // List data
    list: listQuery.data?.tags ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,

    // Methods
    create: (data: CreateTagRequest) => createMutation.mutate(data),
    update: (id: number, data: UpdateTagRequest) =>
      updateMutation.mutate({ id, data }),
    delete: (id: number) => deleteMutation.mutate(id),
    assignTags: (data: AssignTagsRequest) => assignTagsMutation.mutate(data),
    unassignTags: (data: UnassignTagsRequest) =>
      unassignTagsMutation.mutate(data),

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAssigning: assignTagsMutation.isPending,
    isUnassigning: unassignTagsMutation.isPending,
  };
}