import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Navbar } from "./-components/nav/navbar";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Navbar />
        <SidebarInset className="overflow-hidden">
          <div className="flex flex-col h-screen overflow-hidden">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
              <SidebarTrigger />
            </header>
            <ScrollArea className="flex-1 min-h-0" forceVisible>
              <Outlet />
            </ScrollArea>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
