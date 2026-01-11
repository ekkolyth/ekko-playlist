import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import type { SmtpConfig, SmtpConfigResponse, TestEmailResponse } from "@/lib/api-types";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/settings/email/",
)({
  component: EmailPage,
});

// Zod schema for SMTP config validation
const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z
    .string()
    .min(1, "SMTP port is required")
    .refine(
      (val) => {
        const num = parseInt(val, 10);
        return !isNaN(num) && num >= 1 && num <= 65535;
      },
      { message: "Port must be a number between 1 and 65535" },
    ),
  username: z.string().min(1, "SMTP username is required"),
  password: z.string().optional(),
  from_email: z.string().email("Invalid email format").min(1, "From email is required"),
  from_name: z.string().optional(),
});

type SmtpConfigFormValues = z.infer<typeof smtpConfigSchema>;

function EmailPage() {
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");

  // Fetch SMTP config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: async (): Promise<SmtpConfig> => {
      const res = await fetch("/api/config/smtp", { credentials: "include" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to fetch SMTP config");
      }
      return res.json();
    },
  });

  // Update SMTP config mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: SmtpConfigFormValues) => {
      const updateData: {
        host: string;
        port: number;
        username: string;
        password?: string;
        from_email: string;
        from_name?: string;
      } = {
        host: formData.host.trim(),
        port: parseInt(formData.port, 10),
        username: formData.username.trim(),
        from_email: formData.from_email.trim(),
      };

      // Only include password if provided (allows keeping existing password)
      if (formData.password?.trim()) {
        updateData.password = formData.password.trim();
      }

      if (formData.from_name?.trim()) {
        updateData.from_name = formData.from_name.trim();
      }

      const res = await fetch("/api/config/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to update SMTP config");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("SMTP configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save SMTP configuration");
    },
  });

  // Send test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (email: string): Promise<TestEmailResponse> => {
      const res = await fetch("/api/config/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Failed to send test email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Test email sent successfully");
      setTestEmail("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send test email");
    },
  });

  // TanStack Form with Zod validation
  const form = useForm<SmtpConfigFormValues>({
    defaultValues: {
      host: config?.host || "",
      port: config?.port?.toString() || "",
      username: config?.username || "",
      password: "",
      from_email: config?.from_email || "",
      from_name: config?.from_name || "",
    },
    // Update form values when config loads
    onUpdate: ({ formApi }) => {
      if (config && !formApi.state.isDirty) {
        formApi.setFieldValue("host", config.host || "");
        formApi.setFieldValue("port", config.port?.toString() || "");
        formApi.setFieldValue("username", config.username || "");
        formApi.setFieldValue("password", "");
        formApi.setFieldValue("from_email", config.from_email || "");
        formApi.setFieldValue("from_name", config.from_name || "");
      }
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = smtpConfigSchema.safeParse(value);
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
      // Check if password is required (only if no existing config)
      if (!value.password && !config) {
        toast.error("SMTP password is required");
        return;
      }

      updateMutation.mutate(value);
    },
  });

  const handleTestEmail = () => {
    if (!testEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error("Invalid email format");
      return;
    }

    testEmailMutation.mutate(testEmail.trim());
  };

  return (
    <div className="flex-1 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-1">
            Email
          </h1>
          <p className="text-muted-foreground">
            Configure SMTP settings for sending emails
          </p>
        </div>

        {isLoadingConfig ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <Card>
              <CardHeader>
                <CardTitle>SMTP Configuration</CardTitle>
                <CardDescription>
                  Configure your SMTP server settings for sending emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldSet>
                  <FieldGroup>
                    <form.Field
                      name="host"
                      validators={{
                        onBlur: ({ value }) => {
                          if (!value || !value.trim()) {
                            return "SMTP host is required";
                          }
                          return undefined;
                        },
                      }}
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>SMTP Host</FieldLabel>
                          <FieldContent>
                            <Input
                              id={field.name}
                              type="text"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder="smtp.example.com"
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <FieldError>{field.state.meta.errors[0]}</FieldError>
                            )}
                          </FieldContent>
                        </Field>
                      )}
                    />

                    <form.Field
                      name="port"
                      validators={{
                        onBlur: ({ value }) => {
                          if (!value || !value.trim()) {
                            return "SMTP port is required";
                          }
                          const num = parseInt(value, 10);
                          if (isNaN(num) || num < 1 || num > 65535) {
                            return "Port must be a number between 1 and 65535";
                          }
                          return undefined;
                        },
                      }}
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>SMTP Port</FieldLabel>
                          <FieldContent>
                            <Input
                              id={field.name}
                              type="number"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder="587"
                              min="1"
                              max="65535"
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <FieldError>{field.state.meta.errors[0]}</FieldError>
                            )}
                          </FieldContent>
                        </Field>
                      )}
                    />

                    <form.Field
                      name="username"
                      validators={{
                        onBlur: ({ value }) => {
                          if (!value || !value.trim()) {
                            return "SMTP username is required";
                          }
                          return undefined;
                        },
                      }}
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>SMTP Username</FieldLabel>
                          <FieldContent>
                            <Input
                              id={field.name}
                              type="text"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder="your-username"
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <FieldError>{field.state.meta.errors[0]}</FieldError>
                            )}
                          </FieldContent>
                        </Field>
                      )}
                    />

                    <form.Field
                      name="password"
                      validators={{
                        onBlur: ({ value }) => {
                          // Password is optional - only required if no existing config
                          if (!value || !value.trim()) {
                            if (!config) {
                              return "SMTP password is required";
                            }
                          }
                          return undefined;
                        },
                      }}
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>SMTP Password</FieldLabel>
                          <FieldContent>
                            <Input
                              id={field.name}
                              type="password"
                              value={field.state.value || ""}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder={
                                config?.password
                                  ? "Enter new password or leave blank to keep current"
                                  : "your-password"
                              }
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <FieldError>{field.state.meta.errors[0]}</FieldError>
                            )}
                          </FieldContent>
                        </Field>
                      )}
                    />

                    <form.Field
                      name="from_email"
                      validators={{
                        onBlur: ({ value }) => {
                          if (!value || !value.trim()) {
                            return "From email is required";
                          }
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (!emailRegex.test(value)) {
                            return "Invalid email format";
                          }
                          return undefined;
                        },
                      }}
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>From Email</FieldLabel>
                          <FieldContent>
                            <Input
                              id={field.name}
                              type="email"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder="noreply@example.com"
                              aria-invalid={!!field.state.meta.errors.length}
                            />
                            {field.state.meta.errors.length > 0 && (
                              <FieldError>{field.state.meta.errors[0]}</FieldError>
                            )}
                          </FieldContent>
                        </Field>
                      )}
                    />

                    <form.Field
                      name="from_name"
                      children={(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>From Name</FieldLabel>
                          <FieldContent>
                            <Input
                              id={field.name}
                              type="text"
                              value={field.state.value || ""}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder="Ekko Playlist"
                            />
                          </FieldContent>
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>

                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || form.state.isSubmitting}
                  >
                    {updateMutation.isPending || form.state.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Email</CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="test-email">Test Email Address</FieldLabel>
                  <FieldContent>
                    <div className="flex gap-2">
                      <Input
                        id="test-email"
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={testEmailMutation.isPending}
                      >
                        {testEmailMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Test Email
                          </>
                        )}
                      </Button>
                    </div>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
