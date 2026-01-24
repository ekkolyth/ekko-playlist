import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useOIDCProviders } from "@/hooks/use-oidc-providers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ekkolyth/ui';
import { AlertCircle, Plus, Shield, Trash2, Edit2 } from "lucide-react";
import { OIDCProviderForm } from "./-components/oidc-provider-form";

export const Route = createFileRoute("/_authenticated/settings/oidc-providers/")({
  component: OIDCProvidersPage,
});

function OIDCProvidersPage() {
  const {
    allProviders,
    isLoadingAll,
    error,
    envConfigured,
    delete: deleteProvider,
  } = useOIDCProviders({ fetchAll: true });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this OIDC provider? Users will no longer be able to sign in with it after the server is restarted."
      )
    ) {
      return;
    }
    deleteProvider(id);
  };

  const editingProvider = editingId
    ? allProviders.find((p) => p.id === editingId)
    : null;

  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            OIDC Providers
          </h1>
          <p className="text-muted-foreground">
            Configure OpenID Connect providers for authentication
          </p>
        </div>

        {envConfigured && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Managed via Environment</AlertTitle>
            <AlertDescription>
              OIDC providers are configured via environment variables. Changes must be
              made in your environment configuration. The server must be restarted
              after changes.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load OIDC providers"}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>OIDC Providers</CardTitle>
                <CardDescription>
                  Configure OpenID Connect providers for user authentication
                </CardDescription>
              </div>
              {!envConfigured && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAll ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading providers...
              </div>
            ) : allProviders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No OIDC providers configured. {!envConfigured && "Add one to get started."}
              </div>
            ) : (
              <div className="space-y-4">
                {allProviders.map((provider) => (
                  <div
                    key={provider.id || provider.provider_id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{provider.name}</span>
                        <Badge variant={provider.enabled ? "default" : "secondary"}>
                          {provider.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        {envConfigured && (
                          <Badge variant="outline">ENV</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Provider ID: {provider.provider_id}</div>
                        <div>Discovery URL: {provider.discovery_url}</div>
                        <div>Scopes: {provider.scopes.join(", ")}</div>
                      </div>
                    </div>
                    {!envConfigured && (
                      <div className="flex gap-2">
                        {provider.id && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditingId(provider.id!)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(provider.id!)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {(showForm || editingProvider) && !envConfigured && (
          <OIDCProviderForm
            provider={editingProvider}
            onClose={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
