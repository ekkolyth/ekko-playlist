import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const [emailVerificationRequired, setEmailVerificationRequired] = useState<boolean | null>(null);

  // Check if email verification is required
  useEffect(() => {
    // Check EMAIL_VERIFICATION setting via API
    // For now, we'll check user.emailVerified and let backend handle the rest
    // TODO: Add API endpoint to check EMAIL_VERIFICATION setting
    setEmailVerificationRequired(true); // Assume required for now, backend will handle
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/auth/signin" });
      return;
    }

    // Check email verification if required
    if (
      !loading &&
      isAuthenticated &&
      user &&
      emailVerificationRequired &&
      !user.emailVerified
    ) {
      // Allow access to verification page itself
      const currentPath = window.location.pathname;
      if (currentPath !== "/auth/verify-email") {
        navigate({ to: "/auth/verify-email" });
      }
    }
  }, [loading, isAuthenticated, user, emailVerificationRequired, navigate]);

  if (loading || emailVerificationRequired === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Outlet />;
}
