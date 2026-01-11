import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Puzzle, SlidersHorizontal, Key, Mail, BarChart3, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

const settingsNavItems = [
  {
    title: "Profile",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Email",
    href: "/settings/email",
    icon: Mail,
  },
  {
    title: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
  },
  {
    title: "Plugins",
    href: "/settings/plugins",
    icon: Puzzle,
  },
  {
    title: "Preferences",
    href: "/settings/preferences",
    icon: SlidersHorizontal,
  },
];

const adminNavItems = [
  {
    title: "Overview",
    href: "/settings/admin/overview",
    icon: BarChart3,
  },
  {
    title: "Users",
    href: "/settings/admin/users",
    icon: Users,
  },
];

function SettingsLayout() {
  const matchRoute = useMatchRoute();

  return (
    <div className="flex min-h-screen">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col h-full">
          {/* Back to App Button */}
          <div className="p-4 border-b border-border">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link to="/app/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
              </Link>
            </Button>
          </div>

          {/* Settings Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <div className="px-3 py-2">
                <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                  Settings
                </h2>
              </div>
              {settingsNavItems.map((item) => {
                const isActive = matchRoute({ to: item.href });
                const Icon = item.icon;

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </Button>
                );
              })}
              
              {/* Admin Section */}
              <div className="px-3 py-2 mt-6">
                <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
                  Admin
                </h2>
              </div>
              {adminNavItems.map((item) => {
                const isActive = matchRoute({ to: item.href });
                const Icon = item.icon;

                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                    asChild
                  >
                    <Link to={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>

      {/* Settings Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
