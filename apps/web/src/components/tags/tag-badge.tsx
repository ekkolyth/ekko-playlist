import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TagInfo } from "@/lib/api-types";
import { colorPalette } from "@/lib/theme-color";

interface TagBadgeProps {
  tag: TagInfo;
  className?: string;
  onClick?: () => void;
}

export function TagBadge({ tag, className, onClick }: TagBadgeProps) {
  const color = colorPalette[tag.color as keyof typeof colorPalette] || tag.color;

  return (
    <Badge
      className={cn(
        "text-xs font-medium border-0 cursor-pointer hover:opacity-80 transition-opacity",
        onClick && "cursor-pointer",
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }}
      onClick={onClick}
    >
      {tag.name}
    </Badge>
  );
}