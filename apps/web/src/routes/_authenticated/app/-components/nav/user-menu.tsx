import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, forwardRef } from "react";
import { MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";

export const UserMenu = forwardRef<HTMLDivElement>((props, ref) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayName = user?.email || "User";
  const userInitials =
    isMounted && displayName
      ? displayName
          .split("@")[0]
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2) || "U"
      : "U";

  return (
    <div
      ref={ref}
      {...props}
      className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-2 group-data-[collapsible=icon]:justify-center cursor-pointer hover:bg-sidebar-accent transition-colors"
    >
      {!isCollapsed && (
        <>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
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
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});

UserMenu.displayName = "UserMenu";
