import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TagBadge } from "./tag-badge";
import { TagCreateDialog } from "./tag-create-dialog";
import { useTags } from "@/hooks/use-tags";
import { Tags, ChevronDown, Plus, Loader2 } from "lucide-react";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

  const handleTagCreated = (tagId: number) => {
    // Automatically select the newly created tag
    if (!selectedTagIds.includes(tagId)) {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <>
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
            {tags.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading tags...
                </span>
              </div>
            ) : tags.list.length === 0 ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No tags available
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setIsCreateDialogOpen(true);
                    setIsOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Tag
                </Button>
              </div>
            ) : (
              <>
                {tags.list.map((tag) => {
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
                })}
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsCreateDialogOpen(true);
                      setIsOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Tag
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <TagCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTagCreated={handleTagCreated}
      />
    </>
  );
}