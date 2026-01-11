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
import { TagBadge } from "./tag-badge";
import { TagSelector } from "./tag-selector";
import { useTags } from "@/hooks/use-tags";
import { Loader2 } from "lucide-react";
import type { Video } from "@/lib/api-types";

interface TagDetailsDialogProps {
  video: Video | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagDetailsDialog({
  video,
  open,
  onOpenChange,
}: TagDetailsDialogProps) {
  const tags = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize selected tags from video tags when dialog opens
  useEffect(() => {
    if (video && open) {
      const videoTagIds = video.tags?.map((tag) => tag.id) || [];
      setSelectedTagIds(videoTagIds);
      setIsEditing(false);
    }
  }, [video, open]);

  const handleSave = () => {
    if (!video) return;

    const currentTagIds = video.tags?.map((tag) => tag.id) || [];
    const tagsToAdd = selectedTagIds.filter((id) => !currentTagIds.includes(id));
    const tagsToRemove = currentTagIds.filter((id) => !selectedTagIds.includes(id));

    // Add new tags
    if (tagsToAdd.length > 0) {
      tags.assignTags({
        videoIds: [video.id],
        tagIds: tagsToAdd,
      });
    }

    // Remove tags
    if (tagsToRemove.length > 0) {
      tags.unassignTags({
        videoId: video.id,
        tagIds: tagsToRemove,
      });
    }

    setIsEditing(false);
    // Close dialog after mutations (they will handle cache invalidation)
    // The dialog will close when videos refresh
    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (video) {
      const videoTagIds = video.tags?.map((tag) => tag.id) || [];
      setSelectedTagIds(videoTagIds);
    }
    setIsEditing(false);
  };

  if (!video) return null;

  const videoTags = video.tags || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tags for Video</DialogTitle>
          <DialogDescription>
            {video.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!isEditing ? (
            <div className="space-y-2">
              {videoTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tags assigned to this video.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {videoTags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <TagSelector
                selectedTagIds={selectedTagIds}
                onSelectionChange={setSelectedTagIds}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Tags
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={tags.isAssigning || tags.isUnassigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={tags.isAssigning || tags.isUnassigning}
              >
                {tags.isAssigning || tags.isUnassigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}