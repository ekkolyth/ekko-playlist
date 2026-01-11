import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Field, FieldLabel } from "@/components/ui/field";

interface ChannelFilterProps {
  channels: string[];
  selectedChannels: string[];
  onSelectionChange: (selected: string[]) => void;
}

export function ChannelFilter({
  channels,
  selectedChannels,
  onSelectionChange,
}: ChannelFilterProps) {
  const [open, setOpen] = useState(false);

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
  };

  const sortedChannels = [...channels].sort();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Filter className="h-4 w-4" />
          {selectedChannels.length > 0 && (
            <Badge
              variant="default"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {selectedChannels.length}
            </Badge>
          )}
          <span className="sr-only">Filter by channel</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-background flex flex-col"
        align="end"
      >
        <div className="border-b px-4 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Filter by Channel</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSelectAll}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleClearAll}
              >
                Clear
              </Button>
            </div>
          </div>
          {selectedChannels.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedChannels.length} channel
              {selectedChannels.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
        <ScrollArea className="h-75">
          <div className="p-2">
            {sortedChannels.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No channels available
              </div>
            ) : (
              <div className="">
                {sortedChannels.map((channel) => (
                  <Field
                    key={channel}
                    orientation="horizontal"
                    className="cursor-pointer w-auto space-x-2 rounded-sm px-2 py-2 hover:bg-accent"
                  >
                    <Checkbox
                      id={`channel-${channel}`}
                      checked={selectedChannels.includes(channel)}
                      onCheckedChange={(checked) =>
                        handleToggleChannel(channel, checked === true)
                      }
                    />
                    <FieldLabel
                      htmlFor={`channel-${channel}`}
                      className="flex text-sm cursor-pointer font-normal text-nowrap text-ellipsis leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {channel}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
