import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Navbar } from './-components/nav/navbar';
import { HeaderSearch } from '@/components/search/header-search';

export const Route = createFileRoute('/_authenticated/app')({
  component: AppLayout,
});

function AppLayout() {
  const router = useRouterState();

  // Show search on dashboard and playlist pages
  const pathname = router.location.pathname;
  const showSearch =
    pathname.startsWith('/app/dashboard') || pathname.startsWith('/app/playlists/');

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Navbar />
        <SidebarInset className='overflow-hidden'>
          <div className='flex flex-col h-screen overflow-hidden'>
            <header className='sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4'>
              <SidebarTrigger />
              {showSearch && (
                <div className='flex-1 max-w-2xl ml-2'>
                  <HeaderSearch />
                </div>
              )}
            </header>
            <ScrollArea
              className='flex-1 min-h-0'
              forceVisible
            >
              <Outlet />
            </ScrollArea>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
