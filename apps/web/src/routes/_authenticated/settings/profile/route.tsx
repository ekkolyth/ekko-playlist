import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useForm, revalidateLogic } from "@tanstack/react-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import type { UserProfile } from "@/lib/api-types";
import { sendEmailVerification } from "@/lib/auth-client";
import { EmailVerificationDialog } from "@/components/email-verification-dialog";
import { toast } from "sonner";
import { Loader2, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  component: ProfilePage,
});

// Zod schema for profile validation
const profileSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  // Image field is not validated - it's set by the upload process, not user input
  image: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // Fetch user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile> => {
      const res = await fetch("/api/user/profile", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to fetch profile");
      }
      return res.json();
    },
  });

  // Upload image mutation - runs immediately when file is selected
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File): Promise<UserProfile> => {
      // Create FormData with just the image and current profile data
      const formDataToSend = new FormData();
      formDataToSend.append("email", profile?.email || "");
      if (profile?.name) {
        formDataToSend.append("name", profile.name);
      }
      formDataToSend.append("image", file);
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        body: formDataToSend,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      toast.success("Profile image updated successfully");
      // Update query cache immediately so UI updates right away
      queryClient.setQueryData(["user-profile"], data);
      // Invalidate and refetch to ensure all components get fresh data
      await queryClient.invalidateQueries({ 
        queryKey: ["user-profile"],
        refetchType: "active", // Only refetch active queries
      });
      // Update preview to use the served URL
      if (data.image) {
        setImagePreview(data.image);
      }
      // Clear selected file since it's now uploaded
      setSelectedFile(null);
      // Revoke object URL if it exists
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload image");
      // Reset preview on error
      setImagePreview(profile?.image || null);
      setSelectedFile(null);
    },
  });

  // Update profile mutation (for name/email changes)
  const updateMutation = useMutation({
    mutationFn: async (formData: ProfileFormValues): Promise<UserProfile> => {
      // Create FormData for multipart/form-data request
      const formDataToSend = new FormData();
      formDataToSend.append("email", formData.email.trim());
      
      if (formData.name?.trim()) {
        formDataToSend.append("name", formData.name.trim());
      }

      // Don't include image if no file selected - keep existing
      if (formData.image === null || formData.image === "") {
        // Explicitly clear image if empty string or null
        formDataToSend.append("image", "");
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        credentials: "include",
        body: formDataToSend,
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Profile updated successfully");
      queryClient.setQueryData(["user-profile"], data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const form = useForm<ProfileFormValues>({
    defaultValues: {
      name: profile?.name || "",
      email: profile?.email || "",
      image: profile?.image || "",
    },
    onUpdate: ({ formApi }) => {
      if (profile && !formApi.state.isDirty) {
        formApi.setFieldValue("name", profile.name || "");
        formApi.setFieldValue("email", profile.email || "");
        formApi.setFieldValue("image", profile.image || "");
        setImagePreview(profile.image || null);
      }
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = profileSchema.safeParse(value);
        if (!result.success) {
          const errors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            const path = err.path.join(".");
            errors[path] = err.message;
          });
          return errors;
        }
        return undefined;
      },
    },
    onSubmit: async ({ value }) => {
      // Check if email has changed
      const emailChanged = profile && value.email !== profile.email;
      
      if (emailChanged) {
        // Store pending email and trigger verification flow
        setPendingEmail(value.email);
        
        try {
          // Send verification email
          await sendEmailVerification(value.email);
          // Open OTP dialog
          setOtpDialogOpen(true);
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to send verification email"
          );
        }
        // Don't update profile yet - wait for OTP verification
        return;
      }
      
      // If email hasn't changed, proceed with normal update
      updateMutation.mutate(value);
    },
  });

  // Handle image file upload - uploads immediately
  // Handle OTP verification
  const handleVerifyOTP = async (code: string) => {
    if (!pendingEmail) {
      throw new Error("No pending email to verify");
    }

    try {
      // Verify OTP and update email
      const res = await fetch("/api/user/profile/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: pendingEmail, code }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to verify email");
      }
      const updatedProfile = await res.json();
      
      // Update the form with the new email
      form.setFieldValue("email", updatedProfile.email);
      
      // Update query cache
      queryClient.setQueryData(["user-profile"], updatedProfile);
      await queryClient.invalidateQueries({ 
        queryKey: ["user-profile"],
        refetchType: "active",
      });
      
      // Close dialog and reset state
      setOtpDialogOpen(false);
      setPendingEmail(null);
      
      toast.success("Email verified and updated successfully");
    } catch (error) {
      throw error; // Re-throw to let dialog handle the error
    }
  };

  // Handle resend verification email
  const handleResendOTP = async () => {
    if (!pendingEmail) {
      throw new Error("No pending email to resend");
    }

    await sendEmailVerification(pendingEmail);
    toast.success("Verification code resent successfully");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Store the file object
    setSelectedFile(file);
    
    // Create object URL for immediate preview
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
    
    // Upload immediately
    uploadImageMutation.mutate(file);
  };

  if (isLoadingProfile) {
    return (
      <div className="flex-1 p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your display name, email address, and profile image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <FieldSet>
                <FieldGroup>
                  {/* Profile Image */}
                  <Field>
                    <FieldLabel>Profile Image</FieldLabel>
                    <FieldContent>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage
                            src={imagePreview || profile?.image || undefined}
                            alt={profile?.name || "Profile"}
                          />
                          <AvatarFallback>
                            <User className="h-10 w-10" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Image
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <p className="text-sm text-muted-foreground">
                            JPG, PNG or GIF. Max size 5MB
                          </p>
                        </div>
                      </div>
                      {/* Image field is hidden - no validation needed as it's set by upload */}
                      <form.Field
                        name="image"
                        children={() => null}
                      />
                    </FieldContent>
                  </Field>

                  {/* Display Name */}
                  <form.Field
                    name="name"
                    validators={{
                      onBlur: () => undefined, // Name is optional
                    }}
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Display Name</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="text"
                            value={field.state.value || ""}
                            onChange={(e) =>
                              field.handleChange(e.target.value || null)
                            }
                            onBlur={field.handleBlur}
                            placeholder="Your display name"
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                          {field.state.meta.errors.length > 0 && (
                            <FieldError>{field.state.meta.errors[0]}</FieldError>
                          )}
                        </FieldContent>
                      </Field>
                    )}
                  />

                  {/* Email */}
                  <form.Field
                    name="email"
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || !value.trim()) {
                          return "Email is required";
                        }
                        const emailRegex =
                          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                          return "Invalid email format";
                        }
                        return undefined;
                      },
                    }}
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="email"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            placeholder="your.email@example.com"
                            aria-invalid={!!field.state.meta.errors.length}
                          />
                          {field.state.meta.errors.length > 0 && (
                            <FieldError>{field.state.meta.errors[0]}</FieldError>
                          )}
                        </FieldContent>
                      </Field>
                    )}
                  />
                </FieldGroup>
              </FieldSet>

              <Button
                type="submit"
                className="mt-6"
                disabled={
                  updateMutation.isPending ||
                  uploadImageMutation.isPending ||
                  form.state.isSubmitting
                }
              >
                {updateMutation.isPending ||
                uploadImageMutation.isPending ||
                form.state.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Email Verification OTP Dialog */}
        {pendingEmail && (
          <EmailVerificationDialog
            open={otpDialogOpen}
            onOpenChange={setOtpDialogOpen}
            email={pendingEmail}
            onVerify={handleVerifyOTP}
            onResend={handleResendOTP}
          />
        )}
      </div>
    </div>
  );
}
