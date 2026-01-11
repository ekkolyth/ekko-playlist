import { useState } from "react";
import { useOIDCProviders, type OIDCProviderConfig } from "@/hooks/use-oidc-providers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface OIDCProviderFormProps {
  provider?: OIDCProviderConfig;
  onClose: () => void;
}

export function OIDCProviderForm({ provider, onClose }: OIDCProviderFormProps) {
  const { create, update } = useOIDCProviders();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    provider_id: provider?.provider_id || "",
    name: provider?.name || "",
    discovery_url: provider?.discovery_url || "",
    client_id: provider?.client_id || "",
    client_secret: provider?.client_secret || "",
    scopes: provider?.scopes?.join(", ") || "openid,profile,email",
    enabled: provider?.enabled ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scopes = formData.scopes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (provider) {
        await update(provider.id, {
          ...formData,
          scopes,
        });
      } else {
        await create({
          ...formData,
          scopes,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving provider:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {provider ? "Edit OIDC Provider" : "Add OIDC Provider"}
          </DialogTitle>
          <DialogDescription>
            Configure an OpenID Connect provider for authentication
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider_id">Provider ID *</Label>
            <Input
              id="provider_id"
              value={formData.provider_id}
              onChange={(e) =>
                setFormData({ ...formData, provider_id: e.target.value })
              }
              placeholder="my-company-oidc"
              required
              disabled={!!provider}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this provider (cannot be changed after creation)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Company OIDC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discovery_url">Discovery URL *</Label>
            <Input
              id="discovery_url"
              type="url"
              value={formData.discovery_url}
              onChange={(e) =>
                setFormData({ ...formData, discovery_url: e.target.value })
              }
              placeholder="https://example.com/.well-known/openid-configuration"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID *</Label>
            <Input
              id="client_id"
              value={formData.client_id}
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Client Secret *</Label>
            <Input
              id="client_secret"
              type="password"
              value={formData.client_secret}
              onChange={(e) =>
                setFormData({ ...formData, client_secret: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scopes">Scopes</Label>
            <Input
              id="scopes"
              value={formData.scopes}
              onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
              placeholder="openid,profile,email"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of OAuth scopes
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enabled: checked })
              }
            />
            <Label htmlFor="enabled">Enabled</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : provider ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
