import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useTokens, type Token } from "@/hooks/use-tokens";

export const Route = createFileRoute("/_authenticated/settings/api-keys/")({
  component: ExtensionTokensPage,
});

function ExtensionTokensPage() {
  const queryClient = useQueryClient();
  const { tokens, isLoading, error, update, delete: deleteToken } = useTokens();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Get the current URL for the server URL display
  const serverUrl = typeof window !== "undefined" ? window.location.origin : "";

  const startEditing = (token: Token) => {
    setEditingId(token.id);
    setEditingName(token.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveTokenName = (tokenId: string) => {
    if (!editingName.trim()) {
      return;
    }

    update(tokenId, editingName.trim());
    cancelEditing();
  };

  const handleDeleteToken = (tokenId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this token? It will stop working immediately.",
      )
    ) {
      return;
    }

    deleteToken(tokenId);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tokens"] });
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
              {error instanceof Error ? error.message : "Failed to load tokens"}
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
          <GenerateTokenCard />

          {/* Existing tokens list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Tokens</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                title="Refresh tokens list"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tokens...</p>
            ) : tokens.length === 0 ? (
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
                            onClick={() => handleDeleteToken(token.id)}
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
