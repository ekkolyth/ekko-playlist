import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ekkolyth/ui";
import { TagManager } from "@/components/tags/tag-manager";
import { usePreferences } from "@/hooks/use-preferences";
import type { ThemeColor } from "@/lib/theme-color";

export const Route = createFileRoute(
  "/_authenticated/settings/preferences/index/",
)({
  component: PreferencesPage,
});

function PreferencesPage() {
  const preferences = usePreferences();

  const handleColorChange = (color: ThemeColor) => {
    preferences.updatePreferences({ primaryColor: color });
  };

  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            Preferences
          </h1>
          <p className="text-muted-foreground">Customize your experience</p>
        </div>

        <div className="space-y-6">
          {/* Primary Color */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Color</CardTitle>
              <CardDescription>
                Choose your preferred primary color for the interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4"></CardContent>
          </Card>

          {/* Tag Management */}
          <Card>
            <CardHeader>
              <CardTitle>Tag Management</CardTitle>
              <CardDescription>
                Create, edit, and delete tags for organizing your videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TagManager />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
