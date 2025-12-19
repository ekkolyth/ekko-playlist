import { createFileRoute } from "@tanstack/react-router";

const API_URL = process.env.API_URL || "http://localhost:1337";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
        const response = await fetch(`${API_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
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
