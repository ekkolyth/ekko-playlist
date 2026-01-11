import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, RefreshCw, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { GenerateTokenCard } from "@/components/generate-token-card";

export const Route = createFileRoute("/_authenticated/settings/api-keys/")({
  component: ExtensionTokensPage,
});

interface Token {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  expires_at?: string | null;
  last_used_at?: string | null;
}

interface TokensResponse {
  tokens: Token[];
}

function ExtensionTokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Get the current URL for the server URL display
  const serverUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Load existing tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const res = await fetch("/api/tokens", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to fetch tokens");
      }
      const data = await res.json();
      console.log("Loaded tokens response:", data);

      // Handle response - check for both 'tokens' and 'Tokens' (Go might capitalize)
      let tokensList: Token[] = [];
      if (data) {
        if (Array.isArray(data)) {
          // If response is directly an array
          tokensList = data as any;
        } else if (data.tokens && Array.isArray(data.tokens)) {
          // If response has a tokens property (lowercase)
          tokensList = data.tokens;
        } else if (
          (data as any).Tokens &&
          Array.isArray((data as any).Tokens)
        ) {
          // Handle capitalized Tokens (Go JSON might capitalize)
          tokensList = (data as any).Tokens.map((t: any) => ({
            id: t.ID || t.id,
            name: t.Name || t.name,
            token_prefix: t.TokenPrefix || t.token_prefix,
            created_at: t.CreatedAt || t.created_at,
            expires_at: t.ExpiresAt || t.expires_at,
            last_used_at: t.LastUsedAt || t.last_used_at,
          }));
        }
      }

      console.log("Parsed tokens list:", tokensList);
      setTokens(tokensList);
    } catch (err) {
      console.error("Error loading tokens:", err);
      // Show error if it's not the initial load (when user might not have tokens)
      if (tokens.length > 0) {
        setError(
          `Failed to load tokens: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
      // Don't show error on initial load if user has no tokens
    }
  };

  const startEditing = (token: Token) => {
    setEditingId(token.id);
    setEditingName(token.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveTokenName = async (tokenId: string) => {
    if (!editingName.trim()) {
      setError("Token name cannot be empty");
      return;
    }

    try {
      const res = await fetch(`/api/tokens/${tokenId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: editingName.trim(),
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to update token");
      }

      // Update local state
      setTokens((prev) =>
        prev.map((t) =>
          t.id === tokenId ? { ...t, name: editingName.trim() } : t,
        ),
      );

      cancelEditing();
    } catch (err) {
      console.error("Error updating token name:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update token name",
      );
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this token? It will stop working immediately.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/tokens/${tokenId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to delete token");
      }

      // Reload tokens list
      await loadTokens();
    } catch (err) {
      console.error("Error deleting token:", err);
      setError(err instanceof Error ? err.message : "Failed to delete token");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Extension Tokens</CardTitle>
          <CardDescription>
            Generate and manage API tokens for use with the browser extension.
            Tokens are reusable until they expire or are deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {/* Server URL info */}
          <div className="p-4 bg-muted rounded-lg">
            <Label htmlFor="server-url">Server URL</Label>
            <Input
              id="server-url"
              type="text"
              value={serverUrl}
              readOnly
              className="bg-background mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Use this URL when configuring the extension
            </p>
          </div>

          {/* Generate new token */}
          <GenerateTokenCard onTokenGenerated={loadTokens} />

          {/* Existing tokens list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Tokens</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadTokens}
                title="Refresh tokens list"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tokens yet. Generate one above to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => {
                  const isEditing = editingId === token.id;

                  return (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1 space-y-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveTokenName(token.id);
                                } else if (e.key === "Escape") {
                                  cancelEditing();
                                }
                              }}
                              className="font-medium"
                              autoFocus
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => saveTokenName(token.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="font-medium">{token.name}</div>
                        )}
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {token.token_prefix.substring(0, 4) +
                              "•".repeat(12)}
                          </code>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created{" "}
                          {format(new Date(token.created_at), "MMM d, yyyy")}
                          {token.last_used_at && (
                            <>
                              {" "}
                              • Last used{" "}
                              {format(
                                new Date(token.last_used_at),
                                "MMM d, yyyy",
                              )}
                            </>
                          )}
                          {token.expires_at && (
                            <>
                              {" "}
                              • Expires{" "}
                              {format(
                                new Date(token.expires_at),
                                "MMM d, yyyy",
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {!isEditing && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => startEditing(token)}
                            title="Edit token name"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteToken(token.id)}
                            title="Delete token"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
