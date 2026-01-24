import { useState, useMemo } from "react";
import { Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
  FieldDescription,
  FieldSet,
  FieldGroup,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";

// YouTube URL regex patterns
const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
  /^https?:\/\/youtu\.be\/[\w-]+/,
  /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
  /^https?:\/\/music\.youtube\.com\/watch\?v=[\w-]+/,
];

// Zod schema for form validation
const addVideoSchema = z.object({
  youtubeUrl: z
    .string()
    .min(1, "YouTube URL is required")
    .refine(
      (url) => YOUTUBE_URL_PATTERNS.some((pattern) => pattern.test(url)),
      "Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)",
    ),
  channelName: z.string().min(1, "Channel name is required"),
  title: z.string().min(1, "Video title is required"),
});

type AddVideoFormValues = z.infer<typeof addVideoSchema>;

interface AddVideoDialogProps {
  availableChannels: string[];
}

interface ProcessPlaylistResponse {
  processed: Array<{
    channel: string;
    originalUrl: string;
    normalizedUrl: string;
    title: string;
    isValid: boolean;
    error?: string;
  }>;
  total: number;
  valid: number;
  invalid: number;
}

async function addVideo(data: {
  url: string;
  channel: string;
  title: string;
}): Promise<ProcessPlaylistResponse> {
  const response = await fetch("/api/process/playlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      videos: [
        {
          url: data.url,
          channel: data.channel,
          title: data.title,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(error.message || "Failed to add video");
  }

  return response.json();
}

export function AddVideoDialog({ availableChannels }: AddVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [channelPopoverOpen, setChannelPopoverOpen] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: addVideo,
    onSuccess: (data) => {
      if (data.valid > 0) {
        toast.success("Video added successfully!");
        queryClient.invalidateQueries({ queryKey: ["videos"] });
        setOpen(false);
        form.reset();
        setChannelSearch("");
      } else if (data.processed[0]?.error) {
        toast.error(`Failed to add video: ${data.processed[0].error}`);
      } else {
        toast.error("Failed to add video. Please check the URL.");
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to add video",
      );
    },
  });

  const form = useForm<AddVideoFormValues>({
    defaultValues: {
      youtubeUrl: "",
      channelName: "",
      title: "",
    },
    validators: {
      onSubmitAsync: addVideoSchema,
    },
    onSubmit: async ({ value }) => {
      mutation.mutate({
        url: value.youtubeUrl,
        channel: value.channelName,
        title: value.title,
      });
    },
  });

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!channelSearch.trim()) {
      return availableChannels;
    }
    const searchLower = channelSearch.toLowerCase();
    return availableChannels.filter((channel) =>
      channel.toLowerCase().includes(searchLower),
    );
  }, [availableChannels, channelSearch]);

  // Check if we should show "Create new" option
  const showCreateNew = useMemo(() => {
    if (!channelSearch.trim()) return false;
    const searchLower = channelSearch.toLowerCase();
    return !availableChannels.some(
      (channel) => channel.toLowerCase() === searchLower,
    );
  }, [availableChannels, channelSearch]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setChannelSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Add video">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add video</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add YouTube Video</DialogTitle>
          <DialogDescription>
            Add a YouTube video to your library by entering its URL and channel
            information.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldSet className="gap-4 py-4">
            <FieldGroup>
              {/* YouTube URL Field */}
              <form.Field
                name="youtubeUrl"
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>YouTube URL</FieldLabel>
                    <FieldContent>
                      <Input
                        id={field.name}
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError>
                          {typeof field.state.meta.errors[0] === 'string'
                            ? field.state.meta.errors[0]
                            : field.state.meta.errors[0]?.message || String(field.state.meta.errors[0])}
                        </FieldError>
                      )}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              {/* Title Field */}
              <form.Field
                name="title"
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <FieldContent>
                      <Input
                        id={field.name}
                        type="text"
                        placeholder="Video title"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={field.state.meta.errors.length > 0}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError>
                          {typeof field.state.meta.errors[0] === 'string'
                            ? field.state.meta.errors[0]
                            : field.state.meta.errors[0]?.message || String(field.state.meta.errors[0])}
                        </FieldError>
                      )}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              {/* Channel Name Field with Search */}
              <form.Field
                name="channelName"
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Channel Name</FieldLabel>
                    <FieldContent>
                      <Popover
                        open={channelPopoverOpen}
                        onOpenChange={setChannelPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={channelPopoverOpen}
                            aria-invalid={field.state.meta.errors.length > 0}
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.state.value && "text-muted-foreground",
                            )}
                          >
                            {field.state.value ||
                              "Select or type channel name..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-0"
                          align="start"
                        >
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search channels..."
                              value={channelSearch}
                              onValueChange={setChannelSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {channelSearch.trim()
                                  ? "No channels found."
                                  : "Type to search or create a channel."}
                              </CommandEmpty>
                              {showCreateNew && (
                                <CommandGroup heading="Create new">
                                  <CommandItem
                                    value={`create-${channelSearch}`}
                                    onSelect={() => {
                                      field.handleChange(channelSearch.trim());
                                      setChannelPopoverOpen(false);
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{channelSearch.trim()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              {filteredChannels.length > 0 && (
                                <CommandGroup heading="Existing channels">
                                  {filteredChannels.map((channel) => (
                                    <CommandItem
                                      key={channel}
                                      value={channel}
                                      onSelect={() => {
                                        field.handleChange(channel);
                                        setChannelPopoverOpen(false);
                                        setChannelSearch("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.state.value === channel
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {channel}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FieldDescription>
                        Select an existing channel or type a new one
                      </FieldDescription>
                      {field.state.meta.errors.length > 0 && (
                        <FieldError>
                          {typeof field.state.meta.errors[0] === 'string'
                            ? field.state.meta.errors[0]
                            : field.state.meta.errors[0]?.message || String(field.state.meta.errors[0])}
                        </FieldError>
                      )}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.state.isSubmitting || mutation.isPending}
            >
              {(form.state.isSubmitting || mutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Video
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
