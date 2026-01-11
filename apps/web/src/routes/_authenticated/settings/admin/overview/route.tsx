import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/admin/overview")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            Admin Overview
          </h1>
          <p className="text-muted-foreground">
            View system statistics and analytics
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                Admin overview will be available in a future update
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
