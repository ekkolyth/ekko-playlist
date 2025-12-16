import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Key, ListMusic } from "lucide-react";

type SidebarItem = { label: string; href: string; icon: LucideIcon };

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Playlists", href: "/playlists/all", icon: ListMusic },
      { label: "Extension Tokens", href: "/extension-tokens", icon: Key },
    ],
  },
];
