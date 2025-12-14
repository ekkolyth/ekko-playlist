import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Providers } from '../providers'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Navbar } from '@/components/nav/navbar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { FileX, Home } from 'lucide-react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => {
    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: 'Ekko Playlist'
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
      ],
    };
  },

  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className='dark bg-background text-foreground'>
        <Providers>
          <SidebarProvider>
            <Navbar />
            <SidebarInset>
              {children}
            </SidebarInset>
          </SidebarProvider>
        </Providers>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
            <FileX className="w-12 h-12 text-slate-400" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-300 mb-4">Page Not Found</h2>
        <p className="text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary/90 text-white"
          asChild
        >
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  )
}

