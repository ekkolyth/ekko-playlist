import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/auth/signin" });
      return;
    }

    // Check email verification status
    // Better Auth sets emailVerified based on EMAIL_VERIFICATION env var:
    // - If EMAIL_VERIFICATION=false: emailVerified=true automatically
    // - If EMAIL_VERIFICATION=true: emailVerified=false until verified
    // So we just check the user's actual status, which reflects server config
    if (!loading && isAuthenticated && user && !user.emailVerified) {
      // Allow access to verification page itself
      const currentPath = location.pathname;
      if (
        currentPath !== "/auth/verify-email" &&
        !currentPath.startsWith("/auth/signout")
      ) {
        navigate({ to: "/auth/verify-email" });
      }
    }
  }, [loading, isAuthenticated, user, navigate, location.pathname]);

  if (loading) {
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
