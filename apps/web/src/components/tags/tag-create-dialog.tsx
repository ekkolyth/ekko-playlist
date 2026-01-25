import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { useTags } from "@/hooks/use-tags";
import { Loader2 } from "lucide-react";
import type { ThemeColor } from "@/lib/theme-color";

interface TagCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagCreated?: (tagId: number) => void;
}

export function TagCreateDialog({
  open,
  onOpenChange,
  onTagCreated,
}: TagCreateDialogProps) {
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState<ThemeColor>("blue");
  const [error, setError] = useState<string | null>(null);

  const tags = useTags();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTagName("");
      setTagColor("blue");
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    // Reset error
    setError(null);

    // Validation
    if (!tagName.trim()) {
      setError("Tag name is required");
      return;
    }

    // Check for duplicate names (case-insensitive)
    const trimmedName = tagName.trim();
    const existingTag = tags.list.find(
      (tag) => tag.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingTag) {
      setError(`A tag with the name "${existingTag.name}" already exists`);
      return;
    }

    // Store the tag info for callback
    const tagInfo = { name: trimmedName, color: tagColor };

    // Create tag - the useTags hook will handle the API call and cache invalidation
    tags.create(tagInfo);

    // Close dialog immediately
    onOpenChange(false);

    // Wait for query to refetch and find the new tag
    // Use a small delay to allow React Query to refetch
    setTimeout(() => {
      if (onTagCreated) {
        // Find the tag by name and color after refetch
        const newTag = tags.list.find(
          (tag) =>
            tag.name.toLowerCase() === tagInfo.name.toLowerCase() &&
            tag.color === tagInfo.color
        );
        if (newTag) {
          onTagCreated(newTag.id);
        }
      }
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !tags.isCreating) {
      handleCreate();
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag to organize your videos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-tag-name">Tag Name</Label>
            <Input
              id="create-tag-name"
              placeholder='e.g., "Tutorials"'
              value={tagName}
              onChange={(e) => {
                setTagName(e.target.value);
                setError(null); // Clear error when user types
              }}
              onKeyDown={handleKeyDown}
              aria-invalid={!!error}
              aria-describedby={error ? "create-tag-error" : undefined}
              autoFocus
            />
            {error && (
              <p
                id="create-tag-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <ColorPicker value={tagColor} onValueChange={setTagColor} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={tags.isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!tagName.trim() || tags.isCreating}
          >
            {tags.isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Tag"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
