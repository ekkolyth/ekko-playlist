import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, forwardRef } from "react";
import { MoreVertical } from "lucide-react";
import { useSidebar } from '@ekkolyth/ui';
import { UserProfileAvatar } from "@/components/user-profile-avatar";

export const UserMenu = forwardRef<HTMLDivElement>((props, ref) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayName = user?.email || "User";

  return (
    <div
      ref={ref}
      {...props}
      className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:justify-center cursor-pointer hover:bg-sidebar-accent transition-colors"
    >
      {!isCollapsed && (
        <>
          <UserProfileAvatar
            size="md"
            fallbackText={user?.email?.split("@")[0] || "U"}
            className="size-8"
          />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-sidebar-foreground">
              {isMounted ? displayName : "User"}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              {isMounted ? user?.email || "" : ""}
            </span>
          </div>
          <div className="size-8 flex items-center justify-center">
            <MoreVertical className="size-4 text-sidebar-foreground/70" />
            <span className="sr-only">More options</span>
          </div>
        </>
      )}
      {isCollapsed && (
        <UserProfileAvatar
          size="md"
          fallbackText={user?.email?.split("@")[0] || "U"}
          className="size-8"
        />
      )}
    </div>
  );
});

UserMenu.displayName = "UserMenu";
