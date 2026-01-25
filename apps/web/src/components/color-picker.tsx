import { useTheme } from "@/contexts/theme-context";
import { usePreferences } from "@/hooks/use-preferences";
import { colorPalette, type ThemeColor } from "@/lib/theme-color";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function ColorPicker() {
  const { primaryColor } = useTheme();
  const { updatePreferences, isUpdating } = usePreferences();

  const colors: Array<{ id: ThemeColor; label: string; value: string }> = [
    { id: "amber", label: "Amber", value: colorPalette.amber },
    { id: "blue", label: "Blue", value: colorPalette.blue },
    { id: "cyan", label: "Cyan", value: colorPalette.cyan },
    { id: "emerald", label: "Emerald", value: colorPalette.emerald },
    { id: "fuchsia", label: "Fuchsia", value: colorPalette.fuchsia },
    { id: "green", label: "Green", value: colorPalette.green },
    { id: "indigo", label: "Indigo", value: colorPalette.indigo },
    { id: "lime", label: "Lime", value: colorPalette.lime },
    { id: "orange", label: "Orange", value: colorPalette.orange },
    { id: "pink", label: "Pink", value: colorPalette.pink },
    { id: "purple", label: "Purple", value: colorPalette.purple },
    { id: "red", label: "Red", value: colorPalette.red },
  ];

  return (
    <div className="rounded-lg bg-card/80 p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Theme Color
      </div>
      <div className="grid grid-cols-4 gap-3">
        {colors.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => {
              if (!isUpdating) {
                updatePreferences({ primaryColor: color.id });
              }
            }}
            disabled={isUpdating}
            className={cn(
              "relative flex size-9 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed",
              primaryColor === color.id
                ? "ring-2 ring-offset-2 ring-offset-background"
                : "hover:scale-110"
            )}
            style={{ 
              backgroundColor: color.value,
              ringColor: primaryColor === color.id ? color.value : undefined
            }}
            aria-label={`${color.label} theme`}
            aria-pressed={primaryColor === color.id}
          >
            {primaryColor === color.id && (
              <Check className="size-4 text-white drop-shadow-md" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
