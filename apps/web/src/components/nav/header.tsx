import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, LogOut, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfileAvatar } from "@/components/user-profile-avatar";
import { HeaderSearch } from "@/components/search/header-search";
import { ColorPicker } from "@/components/color-picker";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const router = useRouterState();
  
  // Show search on dashboard and playlist pages
  const pathname = router.location.pathname;
  const showSearch = isAuthenticated && (
    pathname.startsWith('/app/dashboard') || 
    pathname.startsWith('/app/playlists/')
  );

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/" });
    // Reload to clear session
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity shrink-0"
        >
          Ekko Playlist
        </Link>

        {/* Search bar - centered */}
        {showSearch && (
          <div className="flex-1 max-w-2xl">
            <HeaderSearch />
          </div>
        )}

        {/* Right side navigation */}
        <nav className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <UserProfileAvatar
                      size="sm"
                      fallbackText={user?.email?.split("@")[0] || "U"}
                    />
                    <span className="text-sm text-muted-foreground">
                      {user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-0 !bg-background">
                  <div className="px-4 py-3 border-b">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="p-2">
                    <ColorPicker />
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <DropdownMenuItem asChild>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="w-full justify-start font-normal text-destructive hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth/signin">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
