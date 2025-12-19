import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

export const Route = createFileRoute("/api/extension-token")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          // Get the Better Auth session from the request
          const session = await auth.api.getSession({
            headers: await request.headers,
          });

          if (!session?.user) {
            return new Response(
              JSON.stringify({ error: "Not authenticated" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Get user email from session
          const email = session.user.email;
          if (!email) {
            return new Response(
              JSON.stringify({ error: "User email not found" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Create a Go API session token directly
          // We'll need to get or create the user in Go API
          // For now, let's try to get the user's existing Go API token from the database
          // Or create a new session for them

          // Actually, we need to call the Go API to create a token
          // But we don't have the password. We need a special endpoint in Go API
          // that accepts Better Auth session verification

          // For now, let's create a token using the Go API's internal functions
          // We'll need to import the Go API client or make an internal call

          // Simplest: Make a request to Go API with Better Auth session info
          // But Go API doesn't know about Better Auth sessions yet

          // Temporary solution: Return the Better Auth one-time token
          // and have the extension use it, but Go API needs to support it

          // Actually, let's create a Go API session using a special method
          // We'll need to modify Go API to accept Better Auth verification

          // For now, return error explaining we need password or Better Auth integration
          return new Response(
            JSON.stringify({
              error:
                "Go API token generation requires password. Please implement Better Auth session verification in Go API.",
            }),
            {
              status: 501,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          console.error("Error generating extension token:", error);
          return new Response(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
