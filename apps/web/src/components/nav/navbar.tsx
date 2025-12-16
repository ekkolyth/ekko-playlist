import { Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect, useRef } from 'react';
import { LogOut, MoreVertical, Play } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sidebarSections } from './sidebar-config';

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              side={isCollapsed ? 'right' : 'top'}
              className='w-56'
            >
              <DropdownMenuLabel>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-medium leading-none'>{displayName}</p>
                  <p className='text-xs leading-none text-muted-foreground'>{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                variant='destructive'
              >
                <LogOut className='mr-2 h-4 w-4' />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
