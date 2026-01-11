import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { TagBadge } from "./tag-badge";
import { useTags } from "@/hooks/use-tags";
import { Loader2, Plus, Pencil, Trash2, Tags } from "lucide-react";
import type { ThemeColor } from "@/lib/theme-color";
import { colorPalette } from "@/lib/theme-color";

export function TagManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{
    id: number;
    name: string;
    color: ThemeColor;
  } | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState<ThemeColor>("blue");

  const tags = useTags();

  const handleCreate = () => {
    if (!tagName.trim()) {
      return;
    }
    tags.create({ name: tagName.trim(), color: tagColor });
    setTagName("");
    setTagColor("blue");
  };

  const handleEdit = (tag: { id: number; name: string; color: string }) => {
    setEditingTag({
      id: tag.id,
      name: tag.name,
      color: tag.color as ThemeColor,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTag || !editingTag.name.trim()) {
      return;
    }
    tags.update(editingTag.id, {
      name: editingTag.name.trim(),
      color: editingTag.color,
    });
    setIsEditDialogOpen(false);
    setEditingTag(null);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      tags.delete(id);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Tags className="mr-2 h-4 w-4" />
            Manage Tags
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Create, edit, and delete tags for organizing your videos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new tag */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="tag-name">Tag Name</Label>
                <Input
                  id="tag-name"
                  placeholder='e.g., "Tutorials"'
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreate();
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <ColorPicker value={tagColor} onValueChange={setTagColor} />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!tagName.trim() || tags.isCreating}
                className="w-full"
              >
                {tags.isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tag
                  </>
                )}
              </Button>
            </div>

            {/* Tags list */}
            <div className="space-y-2">
              <Label>Your Tags</Label>
              {tags.list.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No tags yet. Create your first tag above.
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.list.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <TagBadge
                        tag={{
                          id: tag.id,
                          name: tag.name,
                          color: tag.color,
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tag)}
                          disabled={tags.isUpdating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tag.id)}
                          disabled={tags.isDeleting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag name and color.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-name">Tag Name</Label>
              <Input
                id="edit-tag-name"
                value={editingTag?.name || ""}
                onChange={(e) =>
                  setEditingTag(
                    editingTag
                      ? { ...editingTag, name: e.target.value }
                      : null
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUpdate();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker
                value={editingTag?.color || "blue"}
                onValueChange={(color) =>
                  setEditingTag(
                    editingTag ? { ...editingTag, color } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={tags.isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!editingTag?.name.trim() || tags.isUpdating}
            >
              {tags.isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}