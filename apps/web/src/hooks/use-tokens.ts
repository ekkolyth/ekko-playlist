import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Token {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  expires_at?: string | null;
  last_used_at?: string | null;
}

interface TokensResponse {
  tokens?: Token[];
  Tokens?: Array<{
    ID?: string;
    id?: string;
    Name?: string;
    name?: string;
    TokenPrefix?: string;
    token_prefix?: string;
    CreatedAt?: string;
    created_at?: string;
    ExpiresAt?: string | null;
    expires_at?: string | null;
    LastUsedAt?: string | null;
    last_used_at?: string | null;
  }>;
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

// Helper function to parse token response (handles various formats)
function parseTokensResponse(data: unknown): Token[] {
  if (!data) {
    return [];
  }

  // If response is directly an array
  if (Array.isArray(data)) {
    return data as Token[];
  }

  const response = data as TokensResponse;

  // If response has a tokens property (lowercase)
  if (response.tokens && Array.isArray(response.tokens)) {
    return response.tokens;
  }

  // Handle capitalized Tokens (Go JSON might capitalize)
  if (response.Tokens && Array.isArray(response.Tokens)) {
    return response.Tokens.map((t) => ({
      id: t.ID || t.id || "",
      name: t.Name || t.name || "",
      token_prefix: t.TokenPrefix || t.token_prefix || "",
      created_at: t.CreatedAt || t.created_at || "",
      expires_at: t.ExpiresAt !== undefined ? t.ExpiresAt : t.expires_at,
      last_used_at:
        t.LastUsedAt !== undefined ? t.LastUsedAt : t.last_used_at,
    }));
  }

  return [];
}

export function useTokens() {
  const queryClient = useQueryClient();

  // List all tokens
  const listQuery = useQuery({
    queryKey: ["tokens"],
    queryFn: async () => {
      const data = await apiFetch<unknown>("/api/tokens");
      return parseTokensResponse(data);
    },
  });

  // Create token mutation
  const createMutation = useMutation({
    mutationFn: ({ name, token }: { name: string; token: string }) =>
      apiFetch<Token>("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, token }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      toast.success("Token created successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to create token");
    },
  });

  // Update token mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<Token>(`/api/tokens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      toast.success("Token updated successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update token");
    },
  });

  // Delete token mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/tokens/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokens"] });
      toast.success("Token deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete token");
    },
  });

  return {
    // List data
    tokens: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,

    // Methods
    create: (name: string, token: string) =>
      createMutation.mutate({ name, token }),
    update: (id: string, name: string) => updateMutation.mutate({ id, name }),
    delete: (id: string) => deleteMutation.mutate(id),

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Expose mutations for advanced usage (e.g., getting the generated token)
    createMutation,
  };
}
