import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, revalidateLogic } from "@tanstack/react-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FieldSet,
  FieldGroup,
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUp, authClient } from "@/lib/auth-client";
import Header from "@/components/nav/header";

export const Route = createFileRoute("/auth/signup/")({
  component: SignUpPage,
});

// Zod schema for sign up validation
const signUpSchema = z
  .object({
    email: z.string().email("Invalid email format").min(1, "Email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

function SignUpPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignUpFormValues>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = signUpSchema.safeParse(value);
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
      setError("");
      setLoading(true);

      try {
        // Register with Better Auth
        await signUp.email({
          email: value.email,
          password: value.password,
          name: value.email.split("@")[0], // Use email prefix as name
        });

        // Bearer token is automatically stored by authClient's fetchOptions.onSuccess

        // Wait for session to be available, then check emailVerified status
        // Better Auth may need a moment to create the session after signup
        const checkSession = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            const session = await authClient.getSession();
            if (session.data?.user) {
              // Navigate based on actual emailVerified status
              // This reflects the server's EMAIL_VERIFICATION configuration
              if (!session.data.user.emailVerified) {
                navigate({ to: "/auth/verify-email" });
              } else {
                navigate({ to: "/app/dashboard" });
              }
              setLoading(false);
              return;
            }
            // Wait 200ms before retrying
            if (i < retries - 1) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }
          // Fallback: if session not available after retries, assume verification needed
          navigate({ to: "/auth/verify-email" });
          setLoading(false);
        };

        await checkSession();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center px-6 py-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create an account to get started</CardDescription>
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
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                      {error}
                    </div>
                  )}

                  <form.Field
                    name="email"
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || !value.trim()) {
                          return "Email is required";
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
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="email"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={loading}
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
                        if (!value || !value.trim()) {
                          return "Password is required";
                        }
                        if (value.length < 8) {
                          return "Password must be at least 8 characters";
                        }
                        return undefined;
                      },
                    }}
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={loading}
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
                    name="confirmPassword"
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || !value.trim()) {
                          return "Please confirm your password";
                        }
                        // Access password field value through form state
                        const password = form.state.values.password ?? "";
                        if (value !== password) {
                          return "Passwords do not match";
                        }
                        return undefined;
                      },
                    }}
                    children={(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Confirm Password
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id={field.name}
                            type="password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            disabled={loading}
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
                className="w-full mt-4"
                disabled={loading || form.state.isSubmitting}
              >
                {loading || form.state.isSubmitting
                  ? "Creating account..."
                  : "Sign Up"}
              </Button>
              <div className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link
                  to="/auth/signin"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
