import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OIDCProvider {
  provider_id: string;
  name: string;
  enabled: boolean;
}

export interface OIDCProviderConfig {
  id: string;
  provider_id: string;
  name: string;
  discovery_url: string;
  client_id: string;
  client_secret: string;
  scopes: string[];
  enabled: boolean;
  source?: Record<string, string>;
  env_configured: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOIDCProviderRequest {
  provider_id: string;
  name: string;
  discovery_url: string;
  client_id: string;
  client_secret: string;
  scopes?: string[];
  enabled: boolean;
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

export function useOIDCProviders() {
  const queryClient = useQueryClient();

  // List enabled providers (public)
  const listQuery = useQuery({
    queryKey: ["oidc-providers"],
    queryFn: async () => {
      const data = await apiFetch<OIDCProvider[]>("/api/oidc-providers");
      return data;
    },
  });

  // List all providers (admin)
  const listAllQuery = useQuery({
    queryKey: ["oidc-providers", "all"],
    queryFn: async () => {
      const data = await apiFetch<OIDCProviderConfig[]>("/api/oidc-providers/all");
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (provider: CreateOIDCProviderRequest) =>
      apiFetch<OIDCProviderConfig>("/api/oidc-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oidc-providers"] });
      toast.success("OIDC provider created successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create OIDC provider");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, provider }: { id: string; provider: CreateOIDCProviderRequest }) =>
      apiFetch<OIDCProviderConfig>(`/api/oidc-providers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oidc-providers"] });
      toast.success("OIDC provider updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update OIDC provider");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/oidc-providers/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oidc-providers"] });
      toast.success("OIDC provider deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete OIDC provider");
    },
  });

  return {
    // List data
    providers: listQuery.data ?? [],
    allProviders: listAllQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isLoadingAll: listAllQuery.isLoading,
    error: listQuery.error || listAllQuery.error,
    envConfigured: listAllQuery.data?.[0]?.env_configured ?? false,

    // Methods
    create: (provider: CreateOIDCProviderRequest) =>
      createMutation.mutate(provider),
    update: (id: string, provider: CreateOIDCProviderRequest) =>
      updateMutation.mutate({ id, provider }),
    delete: (id: string) => deleteMutation.mutate(id),

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Expose mutations for advanced usage
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
