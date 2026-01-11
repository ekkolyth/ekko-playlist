import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/process/playlist")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Get Bearer token from Authorization header (for extension use)
        const authHeader = request.headers.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        // Forward request to Go API
        const body = await request.text();
        const response = await fetch(`${process.env.API_URL}/api/process/playlist`, {
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
