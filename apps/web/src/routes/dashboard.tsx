import { createFileRoute, redirect } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-react-start'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Header from '@/components/nav/header'
import { Music, User } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    // This will be handled by Clerk's auth check
    // We'll use client-side check instead
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { isSignedIn, user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    // Redirect will be handled by Clerk's SignInButton
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-muted-foreground">Please sign in to access the dashboard.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}!
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Manage your music playlists from here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Profile</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View and manage your account settings and preferences.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Music className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-white">Playlists</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and manage your music playlists.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

