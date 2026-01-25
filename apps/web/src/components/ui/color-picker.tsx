import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ThemeColor } from "@/lib/theme-color";
import { colorPalette } from "@/lib/theme-color";

interface ColorPickerProps {
  value: ThemeColor;
  onValueChange: (color: ThemeColor) => void;
  className?: string;
}

export function ColorPicker({
  value,
  onValueChange,
  className,
}: ColorPickerProps) {
  const colors: ThemeColor[] = [
    "amber",
    "blue",
    "cyan",
    "emerald",
    "fuchsia",
    "green",
    "indigo",
    "lime",
    "orange",
    "pink",
    "purple",
    "red",
  ];

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onValueChange(color)}
          className={cn(
            "h-10 w-10 rounded-full border-2 transition-all hover:scale-110",
            value === color
              ? "border-foreground ring-2 ring-ring ring-offset-2"
              : "border-border hover:border-foreground/50"
          )}
          style={{ backgroundColor: colorPalette[color] }}
          aria-label={`Select ${color} color`}
        />
      ))}
    </div>
  );
}