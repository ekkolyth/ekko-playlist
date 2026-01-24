import * as React from "react";
import { ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react";
import { PaginationLink } from "@ekkolyth/ui";
import { cn } from "@/lib/utils";

function PaginationFirst({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to first page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronsLeftIcon />
      <span className="hidden sm:block">First</span>
    </PaginationLink>
  );
}

function PaginationLast({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to last page"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Last</span>
      <ChevronsRightIcon />
    </PaginationLink>
  );
}

export { PaginationFirst, PaginationLast };
