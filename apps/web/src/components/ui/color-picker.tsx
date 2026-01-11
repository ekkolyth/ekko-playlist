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
    "red",
    "blue",
    "purple",
    "green",
    "yellow",
    "orange",
    "pink",
    "indigo",
  ];

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onValueChange(color)}
          className={cn(
            "h-10 w-full rounded-md border-2 transition-all hover:scale-105",
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