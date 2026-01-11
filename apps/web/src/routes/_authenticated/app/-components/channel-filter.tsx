import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Field, FieldLabel } from '@/components/ui/field';
import { useSearch } from '@/hooks/use-search';
import { SearchInput } from '@/components/search/search-input';

interface ChannelFilterProps {
  channels: string[];
  selectedChannels: string[];
  onSelectionChange: (selected: string[]) => void;
  showUnassigned: boolean;
  onUnassignedChange: (show: boolean) => void;
}

export function ChannelFilter({
  channels,
  selectedChannels,
  onSelectionChange,
  showUnassigned,
  onUnassignedChange,
}: ChannelFilterProps) {
  const [open, setOpen] = useState(false);
  const [debouncedSearchValue, setSearchValue, searchValue] = useSearch('', 200);

  const handleToggleChannel = (channel: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedChannels, channel]);
    } else {
      onSelectionChange(selectedChannels.filter((c) => c !== channel));
    }
  };

  const handleSelectAll = () => {
    onSelectionChange([...channels]);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
    onUnassignedChange(false);
  };

  const sortedChannels = [...channels].sort();

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    const search = typeof debouncedSearchValue === 'string' ? debouncedSearchValue : '';
    if (!search.trim()) {
      return sortedChannels;
    }
    const searchLower = search.toLowerCase();
    return sortedChannels.filter((channel) => channel.toLowerCase().includes(searchLower));
  }, [sortedChannels, debouncedSearchValue]);

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
          <Filter className='h-4 w-4' />
          {(selectedChannels.length > 0 || showUnassigned) && (
            <Badge
              variant='default'
              className='absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs'
            >
              {selectedChannels.length + (showUnassigned ? 1 : 0)}
            </Badge>
          )}
          <span className='sr-only'>Filter videos</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 p-0 bg-background flex flex-col'
        align='end'
      >
        <div className='border-b px-4 py-3 shrink-0'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold'>Filter Videos</h4>
            <div className='flex gap-2'>
              {channels.length > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs'
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
              )}
              {(selectedChannels.length > 0 || showUnassigned) && (
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
          {(selectedChannels.length > 0 || showUnassigned) && (
            <p className='mt-1 text-xs text-muted-foreground'>
              {[
                selectedChannels.length > 0 &&
                  `${selectedChannels.length} channel${selectedChannels.length !== 1 ? 's' : ''}`,
                showUnassigned && 'unassigned videos',
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
        <div className='px-4 py-3 border-b shrink-0'>
          <SearchInput
            value={searchValue}
            onChange={setSearchValue}
            placeholder='Search channels...'
            aria-label='Search channels'
          />
        </div>
        <ScrollArea className='h-75'>
          <div className='p-2'>
            <Field
              orientation='horizontal'
              className='cursor-pointer w-auto space-x-2 rounded-sm px-2 py-2 hover:bg-accent'
            >
              <Checkbox
                id='filter-unassigned'
                checked={showUnassigned}
                onCheckedChange={(checked) => onUnassignedChange(checked === true)}
              />
              <FieldLabel
                htmlFor='filter-unassigned'
                className='flex text-sm cursor-pointer font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Unassigned
              </FieldLabel>
            </Field>

            {filteredChannels.length > 0 && (
              <>
                <div className='border-b my-2' />
                <div className='px-2 py-1 text-xs font-semibold text-muted-foreground'>
                  Channels
                </div>
                {filteredChannels.map((channel) => (
                  <Field
                    key={channel}
                    orientation='horizontal'
                    className='cursor-pointer w-auto space-x-2 rounded-sm px-2 py-2 hover:bg-accent'
                  >
                    <Checkbox
                      id={`channel-${channel}`}
                      checked={selectedChannels.includes(channel)}
                      onCheckedChange={(checked) => handleToggleChannel(channel, checked === true)}
                    />
                    <FieldLabel
                      htmlFor={`channel-${channel}`}
                      className='flex text-sm cursor-pointer font-normal text-nowrap text-ellipsis leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      {channel}
                    </FieldLabel>
                  </Field>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
