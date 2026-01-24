import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

export const Route = createFileRoute("/api/process/video")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let token: string | undefined;

        // First, try to get Bearer token from Authorization header (for extension use)
        const authHeader = request.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7); // Remove "Bearer " prefix
        }

        // If no Bearer token, try session-based authentication (for web app)
        if (!token) {
          const session = await auth.api.getSession({ headers: request.headers });
          if (session?.session?.token) {
            token = session.session.token;
          }
        }

        // If still no token, return unauthorized
        if (!token) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Forward request to Go API
        const body = await request.text();
        const response = await fetch(`${process.env.API_URL}/api/process/video`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
        });

        const data = await response.text();
        return new Response(data, {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
