import { useQuery } from "@tanstack/react-query";
import type { UserProfile } from "@/lib/api-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useState, useEffect } from "react";

interface UserProfileAvatarProps {
  size?: "sm" | "md" | "lg" | number;
  fallbackText?: string;
  className?: string;
}

const sizeMap = {
  sm: "size-6",
  md: "size-10",
  lg: "size-20",
};

export function UserProfileAvatar({
  size = "md",
  fallbackText,
  className,
}: UserProfileAvatarProps) {
  // Query always runs - component is only rendered when authenticated (checked in parent)
  const { data: profile, dataUpdatedAt } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile> => {
      const res = await fetch("/api/user/profile", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to fetch profile");
      }
      return res.json();
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: "always",
  });

  // Force re-render when profile image changes by using a key based on the image URL
  const [imageKey, setImageKey] = useState(0);
  
  useEffect(() => {
    if (profile?.image) {
      // Update key when image changes to force Avatar to re-render
      setImageKey((prev) => prev + 1);
    }
  }, [profile?.image, dataUpdatedAt]);

  const sizeClass =
    typeof size === "number" ? `size-${size}` : sizeMap[size];

  // Get initials from fallback text
  // Handles both names (e.g., "John Doe" -> "JD") and single words/emails (e.g., "mike" -> "M")
  const getInitials = () => {
    if (fallbackText) {
      const parts = fallbackText.trim().split(" ");
      if (parts.length > 1) {
        // Multiple words: take first letter of first two words
        return parts
          .slice(0, 2)
          .map((n) => n[0])
          .join("")
          .toUpperCase();
      } else {
        // Single word: take first letter (or first two if it's a long single word)
        return fallbackText
          .slice(0, 2)
          .toUpperCase();
      }
    }
    return null;
  };

  // Use profile image directly, same as settings page
  const imageUrl = profile?.image || undefined;

  return (
    <Avatar 
      className={`${sizeClass} ${className || ""}`} 
      key={`avatar-${imageUrl || "no-image"}-${imageKey}`}
    >
      <AvatarImage src={imageUrl} alt={profile?.name || "Profile"} />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials() ? (
          <span className={size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"}>
            {getInitials()}
          </span>
        ) : (
          <User className={size === "sm" ? "h-3 w-3" : size === "lg" ? "h-10 w-10" : "h-5 w-5"} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
