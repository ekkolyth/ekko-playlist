import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TagBadge } from "./tag-badge";
import { useTags } from "@/hooks/use-tags";
import { Tags, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TagInfo } from "@/lib/api-types";

interface TagSelectorProps {
  selectedTagIds: number[];
  onSelectionChange: (tagIds: number[]) => void;
  className?: string;
}

export function TagSelector({
  selectedTagIds,
  onSelectionChange,
  className,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tags = useTags();

  const selectedTags = tags.list.filter((tag) =>
    selectedTagIds.includes(tag.id)
  );

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            <span>
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${selectedTags.length !== 1 ? "s" : ""} selected`
                : "Select tags"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          {tags.list.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No tags available
            </div>
          ) : (
            tags.list.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleTag(tag.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <TagBadge
                    tag={{
                      id: tag.id,
                      name: tag.name,
                      color: tag.color,
                    }}
                    className="flex-1"
                  />
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}