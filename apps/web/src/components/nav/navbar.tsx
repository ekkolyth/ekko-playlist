import { Link, useRouterState } from '@tanstack/react-router'
import { useUser, SignOutButton } from '@clerk/tanstack-react-start'
import { useState, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Play,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type SidebarItem = { label: string; href: string; icon: LucideIcon }

export type SidebarSection = {
  label: string
  items: SidebarItem[]
}

export const sidebarSections: SidebarSection[] = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
]

export function Navbar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [isMounted, setIsMounted] = useState(false)
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined)
  const triggerRef = useRef<HTMLDivElement>(null)
  const { user, isSignedIn } = useUser()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (triggerRef.current) {
      const updateWidth = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect()
          setTriggerWidth(rect.width)
        }
      }
      updateWidth()
      const resizeObserver = new ResizeObserver(updateWidth)
      resizeObserver.observe(triggerRef.current)
      window.addEventListener('resize', updateWidth)
      return () => {
        resizeObserver.disconnect()
        window.removeEventListener('resize', updateWidth)
      }
    }
  }, [isCollapsed])

  const displayName = user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'
  const userInitials =
    isMounted && displayName
      ? displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U'
      : 'U'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Play className="size-4 fill-white" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Ekko Playlist</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {!isCollapsed && <SidebarTrigger />}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const ItemIcon = item.icon
                  const isActive = currentPath === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.href}>
                          <ItemIcon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
          {isCollapsed && (
            <div className="flex items-center justify-center px-2 pb-2">
              <SidebarTrigger />
            </div>
          )}
          {isSignedIn && (
            <>
              <div
                ref={triggerRef}
                className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:justify-center cursor-pointer hover:bg-sidebar-accent transition-colors"
              >
                {!isCollapsed && (
                  <>
                    <Avatar className="size-8">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-sidebar-foreground">
                        {isMounted ? displayName : 'User'}
                      </span>
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {isMounted ? user?.emailAddresses[0]?.emailAddress || '' : ''}
                      </span>
                    </div>
                    <div className="size-8 flex items-center justify-center">
                      <MoreVertical className="size-4 text-sidebar-foreground/70" />
                      <span className="sr-only">More options</span>
                    </div>
                  </>
                )}
                {isCollapsed && (
                  <SignOutButton>
                    <Avatar className="size-8">
                      <AvatarImage src={user?.imageUrl} alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </SignOutButton>
                )}
              </div>
              {!isCollapsed && (
                <div className="px-2 pb-2">
                  <SignOutButton>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 w-full justify-start"
                    >
                      <LogOut className="size-4" />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </div>
              )}
            </>
          )}
        </SidebarFooter>
    </Sidebar>
  )
}

