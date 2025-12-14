import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useUser, SignInButton, SignOutButton } from '@clerk/tanstack-react-start'
import { LogIn, LogOut, LayoutDashboard } from 'lucide-react'

export default function Header() {
    const { isSignedIn, user } = useUser()

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800/50 bg-slate-950/50 backdrop-blur supports-[backdrop-filter]:bg-slate-950/50">
            <div className="w-full flex h-16 items-center justify-between px-6">
                {/* Logo */}
                <Link
                    to="/"
                    className="flex items-center gap-2 font-semibold text-xl text-white hover:opacity-80 transition-opacity"
                >
                    <span className='text-2xl'>Ekko Playlist</span>
                </Link>

                {/* Right side navigation */}
                <nav className="flex items-center gap-4">
                    {isSignedIn ? (
                        <>
                            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800" asChild>
                                <Link to="/dashboard">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Link>
                            </Button>
                            <SignOutButton>
                                <Button
                                    variant="outline"
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out
                                </Button>
                            </SignOutButton>
                        </>
                    ) : (
                        <SignInButton mode="modal">
                            <Button
                                className="bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary/90 text-white"
                            >
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

