import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import { signIn, authClient } from "@/lib/auth-client";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/auth/signin/")({
  component: SignInPage,
});

// Zod schema for sign in validation
const signInSchema = z.object({
  email: z.email("Invalid email format").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

function SignInPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch enabled OIDC providers
  const { data: oidcProviders, isLoading: isLoadingProviders } = useQuery({
    queryKey: ["oidc-providers"],
    queryFn: async () => {
      const res = await fetch("/api/oidc-providers");
      if (!res.ok) {
        return [];
      }
      return res.json();
    },
  });

  const handleOIDCSignIn = async (providerId: string) => {
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.oauth2({
        providerId,
        callbackURL: "/app/dashboard",
        errorCallbackURL: "/auth/signin?error=oauth_error",
      });

      if (!result.data && result.error) {
        throw new Error(result.error.message || "OAuth sign-in failed");
      }
      // Redirect happens automatically
    } catch (err) {
      console.error("OAuth sign-in error:", err);
      setError(err instanceof Error ? err.message : "OAuth sign-in failed");
      setLoading(false);
    }
  };

  const form = useForm<SignInFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onChangeAsync: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setError("");
      setLoading(true);

      try {
        // Authenticate with Better Auth (uses cookie-based sessions for web)
        const signInResult = await signIn.email({
          email: value.email,
          password: value.password,
        });

        if (!signInResult.data) {
          throw new Error(signInResult.error?.message || "Sign in failed");
        }

        // Bearer token for API calls - try to get from session if not in headers
        const { getSessionToken } = await import("@/lib/auth-client");
        const sessionToken = await getSessionToken();
        if (sessionToken && typeof window !== "undefined") {
          localStorage.setItem("better_auth_bearer_token", sessionToken);
          console.log("Bearer token stored from session");
        }

        navigate({ to: "/app/dashboard" });
      } catch (err) {
        console.error("Sign in error:", err);
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center px-6 py-24">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email and password to sign in
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
                  {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                      {error}
                    </div>
                  )}

                  <form.Field
                    name="email"
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
                            <FieldError>
                              {typeof field.state.meta.errors[0] === 'string'
                                ? field.state.meta.errors[0]
                                : field.state.meta.errors[0]?.message || String(field.state.meta.errors[0])}
                            </FieldError>
                          )}
                        </FieldContent>
                      </Field>
                    )}
                  />

                  <form.Field
                    name="password"
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
                            <FieldError>
                              {typeof field.state.meta.errors[0] === 'string'
                                ? field.state.meta.errors[0]
                                : field.state.meta.errors[0]?.message || String(field.state.meta.errors[0])}
                            </FieldError>
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
                  ? "Signing in..."
                  : "Sign In"}
              </Button>
              <div className="text-center text-sm text-muted-foreground mt-4">
                Don't have an account?{" "}
                <Link
                  to="/auth/signup"
                  className="text-primary hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </form>

            {!isLoadingProviders &&
              oidcProviders &&
              oidcProviders.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <p className="text-sm text-center text-muted-foreground">
                      Or sign in with
                    </p>
                    <div className="space-y-2">
                      {oidcProviders.map(
                        (provider: {
                          provider_id: string;
                          name: string;
                          enabled: boolean;
                        }) =>
                          provider.enabled && (
                            <Button
                              key={provider.provider_id}
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() =>
                                handleOIDCSignIn(provider.provider_id)
                              }
                              disabled={loading}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Sign in with {provider.name}
                            </Button>
                          ),
                      )}
                    </div>
                  </div>
                </>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
