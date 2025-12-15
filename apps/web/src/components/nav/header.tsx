import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogIn, LogOut, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/' });
    // Reload to clear session
    window.location.reload();
  };

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95'>
      <div className='container mx-auto flex h-16 items-center justify-between px-4'>
        {/* Logo */}
        <Link
          to='/'
          className='flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity'
        >
          Ekko Playlist
        </Link>

        {/* Right side navigation */}
        <nav className='flex items-center gap-2'>
          {isAuthenticated ? (
            <>
              <Button
                variant='ghost'
                size='sm'
                asChild
              >
                <Link to='/dashboard'>
                  <LayoutDashboard className='mr-2 h-4 w-4' />
                  Dashboard
                </Link>
              </Button>
              <span className='text-sm text-muted-foreground'>{user?.email}</span>
              <Button
                variant='outline'
                size='sm'
                onClick={handleLogout}
              >
                <LogOut className='mr-2 h-4 w-4' />
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              size='sm'
              asChild
            >
              <Link to='/login'>
                <LogIn className='mr-2 h-4 w-4' />
                Sign In
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
