import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Puzzle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/plugins")({
  component: PluginsPage,
});

function PluginsPage() {
  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            Plugins
          </h1>
          <p className="text-muted-foreground">
            Extend functionality with plugins
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Plugin support will be available in a future update
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
