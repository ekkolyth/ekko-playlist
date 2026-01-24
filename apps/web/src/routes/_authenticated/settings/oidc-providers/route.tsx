import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/oidc-providers")({
  component: OIDCProvidersLayout,
});

// Layout component - just renders child routes
function OIDCProvidersLayout() {
  return <Outlet />;
}
