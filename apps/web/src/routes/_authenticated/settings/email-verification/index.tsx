import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
  FieldLegend,
  FieldGroup,
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import {
  getSmtpConfig,
  updateSmtpConfig,
  sendTestEmail,
  type SmtpConfig,
} from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/settings/email-verification/",
)({
  component: EmailVerificationPage,
});

function EmailVerificationPage() {
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");

  // Form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch SMTP config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["smtp-config"],
    queryFn: async () => {
      const data = await getSmtpConfig();
      // Populate form fields when config loads
      if (data) {
        setHost(data.host || "");
        setPort(data.port?.toString() || "");
        setUsername(data.username || "");
        setPassword(""); // Don't populate password field
        setFromEmail(data.from_email || "");
        setFromName(data.from_name || "");
      }
      return data;
    },
  });

  // Update SMTP config mutation
  const updateMutation = useMutation({
    mutationFn: async (config: {
      host: string;
      port: number;
      username: string;
      password: string;
      from_email: string;
      from_name?: string;
    }) => {
      return updateSmtpConfig(config);
    },
    onSuccess: () => {
      toast.success("SMTP configuration saved successfully");
      queryClient.invalidateQueries({ queryKey: ["smtp-config"] });
      setErrors({});
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save SMTP configuration");
    },
  });

  // Send test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return sendTestEmail(email);
    },
    onSuccess: () => {
      toast.success("Test email sent successfully");
      setTestEmail("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send test email");
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!host.trim()) {
      newErrors.host = "SMTP host is required";
    }
    if (!port.trim()) {
      newErrors.port = "SMTP port is required";
    } else {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        newErrors.port = "Port must be a number between 1 and 65535";
      }
    }
    if (!username.trim()) {
      newErrors.username = "SMTP username is required";
    }
    if (!password.trim()) {
      newErrors.password = "SMTP password is required";
    }
    if (!fromEmail.trim()) {
      newErrors.fromEmail = "From email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(fromEmail)) {
        newErrors.fromEmail = "Invalid email format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateMutation.mutate({
      host: host.trim(),
      port: parseInt(port, 10),
      username: username.trim(),
      password: password.trim(),
      from_email: fromEmail.trim(),
      from_name: fromName.trim() || undefined,
    });
  };

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
            Email Verification
          </h1>
          <p className="text-muted-foreground">
            Configure SMTP settings for sending verification emails
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
          <form onSubmit={handleSubmit}>
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
                    <Field>
                      <FieldLabel htmlFor="smtp-host">SMTP Host</FieldLabel>
                      <FieldContent>
                        <Input
                          id="smtp-host"
                          type="text"
                          value={host}
                          onChange={(e) => setHost(e.target.value)}
                          placeholder="smtp.example.com"
                          aria-invalid={!!errors.host}
                        />
                        {errors.host && (
                          <FieldError>{errors.host}</FieldError>
                        )}
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="smtp-port">SMTP Port</FieldLabel>
                      <FieldContent>
                        <Input
                          id="smtp-port"
                          type="number"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          placeholder="587"
                          min="1"
                          max="65535"
                          aria-invalid={!!errors.port}
                        />
                        {errors.port && (
                          <FieldError>{errors.port}</FieldError>
                        )}
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="smtp-username">
                        SMTP Username
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="smtp-username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="your-username"
                          aria-invalid={!!errors.username}
                        />
                        {errors.username && (
                          <FieldError>{errors.username}</FieldError>
                        )}
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="smtp-password">
                        SMTP Password
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="smtp-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={
                            config?.password
                              ? "Enter new password or leave blank to keep current"
                              : "your-password"
                          }
                          aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                          <FieldError>{errors.password}</FieldError>
                        )}
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="from-email">From Email</FieldLabel>
                      <FieldContent>
                        <Input
                          id="from-email"
                          type="email"
                          value={fromEmail}
                          onChange={(e) => setFromEmail(e.target.value)}
                          placeholder="noreply@example.com"
                          aria-invalid={!!errors.fromEmail}
                        />
                        {errors.fromEmail && (
                          <FieldError>{errors.fromEmail}</FieldError>
                        )}
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="from-name">From Name</FieldLabel>
                      <FieldContent>
                        <Input
                          id="from-name"
                          type="text"
                          value={fromName}
                          onChange={(e) => setFromName(e.target.value)}
                          placeholder="Ekko Playlist"
                        />
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <div className="mt-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
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
                  <FieldLabel htmlFor="test-email">
                    Test Email Address
                  </FieldLabel>
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
