import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ThemeColor } from "@/lib/theme-color";
import { themeColorToCSS } from "@/lib/theme-color";

type UserPreferences = {
  userId: string;
  primaryColor: ThemeColor;
  createdAt: string;
  updatedAt: string;
};

interface ThemeContextType {
  primaryColor: ThemeColor;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

async function fetchPreferences(): Promise<UserPreferences> {
  const res = await fetch("/api/preferences", { credentials: "include" });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Failed to fetch preferences");
  }
  return res.json();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: preferences, isLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const primaryColor = (preferences?.primaryColor as ThemeColor) || "blue";

  // Update CSS variables when primary color changes
  useEffect(() => {
    if (preferences?.primaryColor) {
      const color = themeColorToCSS[preferences.primaryColor as ThemeColor];
      if (color) {
        document.documentElement.style.setProperty("--primary", color);
        document.documentElement.style.setProperty("--ring", color);
        document.documentElement.style.setProperty("--accent", color);
        document.documentElement.style.setProperty("--sidebar-primary", color);
        document.documentElement.style.setProperty("--sidebar-ring", color);
      }
    }
  }, [preferences?.primaryColor]);

  return (
    <ThemeContext.Provider value={{ primaryColor, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}