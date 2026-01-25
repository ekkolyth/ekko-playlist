import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type Video } from "@/lib/api-types";

interface VideoPlayerDialogProps {
  video: Video | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPlayerDialog({
  video,
  open,
  onOpenChange,
}: VideoPlayerDialogProps) {
  if (!video) return null;

  const embedUrl = `https://www.youtube.com/embed/${video.videoId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-[calc(100%-32px)] translate-x-[-50%] translate-y-[-50%] duration-200 outline-none",
            "p-0 border-0 bg-transparent shadow-none"
          )}
        >
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0"
              title={video.title}
            />
          </div>
          <DialogPrimitive.Close
            className="ring-offset-background focus:ring-ring absolute top-4 right-4 z-10 rounded-xs bg-black/50 text-white opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 p-2"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
