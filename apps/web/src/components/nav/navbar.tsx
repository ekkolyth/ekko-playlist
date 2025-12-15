import { Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut, MoreVertical, Play } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type SidebarItem = { label: string; href: string; icon: LucideIcon };

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    label: 'MAIN',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
];

export function Navbar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const [isMounted, setIsMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Removed width tracking - not needed

  const displayName = user?.email || 'User';
  const userInitials =
    isMounted && displayName
      ? displayName
          .split('@')[0]
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U'
      : 'U';

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className='flex items-center justify-between gap-2'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size='lg'
              >
                <Link to='/dashboard'>
                  <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                    <Play className='size-4 fill-white' />
                  </div>
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold'>Ekko Playlist</span>
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
                  const ItemIcon = item.icon;
                  const isActive = currentPath === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                      >
                        <Link to={item.href}>
                          <ItemIcon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {isCollapsed && (
          <div className='flex items-center justify-center px-2 pb-2'>
            <SidebarTrigger />
          </div>
        )}
        {isAuthenticated && user && (
          <>
            <div
              ref={triggerRef}
              className='flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:justify-center cursor-pointer hover:bg-sidebar-accent transition-colors'
            >
              {!isCollapsed && (
                <>
                  <Avatar className='size-8'>
                    <AvatarFallback className='bg-primary text-primary-foreground text-xs'>
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-left text-sm leading-tight'>
                    <span className='truncate font-semibold text-sidebar-foreground'>
                      {isMounted ? displayName : 'User'}
                    </span>
                    <span className='truncate text-xs text-sidebar-foreground/70'>
                      {isMounted ? user?.email || '' : ''}
                    </span>
                  </div>
                  <div className='size-8 flex items-center justify-center'>
                    <MoreVertical className='size-4 text-sidebar-foreground/70' />
                    <span className='sr-only'>More options</span>
                  </div>
                </>
              )}
              {isCollapsed && (
                <Avatar className='size-8'>
                  <AvatarFallback className='bg-primary text-primary-foreground text-xs'>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {!isCollapsed && (
              <div className='px-2 pb-2'>
                <Button
                  variant='ghost'
                  className='flex items-center gap-2 w-full justify-start'
                  onClick={logout}
                >
                  <LogOut className='size-4' />
                  Sign Out
                </Button>
              </div>
            )}
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
