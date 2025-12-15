import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Navbar } from '@/components/nav/navbar';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: '/auth/signin' });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-muted-foreground'>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <Navbar />
      <SidebarInset>
        <div className='flex flex-col min-h-screen'>
          <header className='sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background px-4'>
            <SidebarTrigger />
          </header>
          <div className='flex-1'>
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

