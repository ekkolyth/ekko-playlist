export type ThemeColor =
  | "red"
  | "blue"
  | "purple"
  | "green"
  | "yellow"
  | "orange"
  | "pink"
  | "indigo";

export const colorPalette: Record<ThemeColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  green: "#10b981",
  yellow: "#f59e0b",
  orange: "#f97316",
  pink: "#ec4899",
  indigo: "#6366f1",
};

// Map theme colors to CSS variable values for primary color
export const themeColorToCSS: Record<ThemeColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  green: "#10b981",
  yellow: "#f59e0b",
  orange: "#f97316",
  pink: "#ec4899",
  indigo: "#6366f1",
};