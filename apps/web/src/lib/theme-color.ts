export type ThemeColor =
  | "amber"
  | "blue"
  | "cyan"
  | "emerald"
  | "fuchsia"
  | "green"
  | "indigo"
  | "lime"
  | "orange"
  | "pink"
  | "purple"
  | "red";

export const colorPalette: Record<ThemeColor, string> = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  emerald: "#10b981",
  fuchsia: "#d946ef",
  green: "#22c55e",
  indigo: "#6366f1",
  lime: "#84cc16",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#a855f7",
  red: "#ef4444",
};

// Map theme colors to CSS variable values for primary color
export const themeColorToCSS: Record<ThemeColor, string> = {
  amber: "#f59e0b",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  emerald: "#10b981",
  fuchsia: "#d946ef",
  green: "#22c55e",
  indigo: "#6366f1",
  lime: "#84cc16",
  orange: "#f97316",
  pink: "#ec4899",
  purple: "#a855f7",
  red: "#ef4444",
};