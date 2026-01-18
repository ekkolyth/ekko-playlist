import { useState } from 'react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Field, FieldLabel } from '@/components/ui/field';
import { TagBadge } from '@/components/tags/tag-badge';
import { useTags } from '@/hooks/use-tags';

interface TagFilterProps {
  selectedTagIds: number[];
  onSelectionChange: (selected: number[]) => void;
}

export function TagFilter({
  selectedTagIds,
  onSelectionChange,
}: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const tags = useTags();

  const handleToggleTag = (tagId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedTagIds, tagId]);
    } else {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(tags.list.map((tag) => tag.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const sortedTags = [...tags.list].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='relative'
        >
          <Tag className='h-4 w-4' />
          {selectedTagIds.length > 0 && (
            <Badge
              variant='default'
              className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs'
            >
              {selectedTagIds.length}
            </Badge>
          )}
          <span className='sr-only'>Filter by tags</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0 bg-background flex flex-col'
        align='end'
      >
        <div className='border-b px-4 py-3 shrink-0'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold'>Filter by Tags</h4>
            <div className='flex gap-2'>
              {sortedTags.length > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              )}
              {selectedTagIds.length > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={handleClearAll}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          {selectedTagIds.length > 0 && (
            <p className='mt-1 text-xs text-muted-foreground'>
              {selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <ScrollArea className='h-75'>
          <div className='p-2'>
            {tags.isLoading ? (
              <div className='text-sm text-muted-foreground py-4 text-center'>
                Loading tags...
              </div>
            ) : sortedTags.length === 0 ? (
              <div className='text-sm text-muted-foreground py-4 text-center'>
                No tags available
              </div>
            ) : (
              sortedTags.map((tag) => (
                <Field
                  key={tag.id}
                  orientation='horizontal'
                  className='cursor-pointer w-auto space-x-2 rounded-sm px-2 py-2 hover:bg-accent'
                >
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={selectedTagIds.includes(tag.id)}
                    onCheckedChange={(checked) => handleToggleTag(tag.id, checked === true)}
                  />
                  <FieldLabel
                    htmlFor={`tag-${tag.id}`}
                    className='flex text-sm cursor-pointer font-normal text-nowrap text-ellipsis leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    <TagBadge
                      tag={{
                        id: tag.id,
                        name: tag.name,
                        color: tag.color,
                      }}
                    />
                  </FieldLabel>
                </Field>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}