import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ListMusic } from "lucide-react";

type SidebarItem = { label: string; href: string; icon: LucideIcon };

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { label: "Playlists", href: "/app/playlists", icon: ListMusic },
    ],
  },
];
