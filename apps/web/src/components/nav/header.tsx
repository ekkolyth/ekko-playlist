import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useUser, SignInButton, SignOutButton } from '@clerk/tanstack-react-start'
import { LogIn, LogOut, LayoutDashboard } from 'lucide-react'

export default function Header() {
    const { isSignedIn, user } = useUser()

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2 font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity"
                >
                    Ekko Playlist
                </Link>

                {/* Right side navigation */}
                <nav className="flex items-center gap-2">
                    {isSignedIn ? (
                        <>
                            <Button variant="ghost" size="sm" asChild>
                                <Link to="/dashboard">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Link>
                            </Button>
                            <SignOutButton>
                                <Button variant="outline" size="sm">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out
                                </Button>
                            </SignOutButton>
                        </>
                    ) : (
                        <SignInButton mode="modal">
                            <Button size="sm">
                                <LogIn className="mr-2 h-4 w-4" />
                                Sign In
                            </Button>
                        </SignInButton>
                    )}
                </nav>
            </div>
        </header>
    )
}

