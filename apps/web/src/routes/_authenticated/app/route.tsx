import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "./-components/nav/navbar";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Navbar />
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
              <SidebarTrigger />
            </header>
            <div className="flex-1">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
