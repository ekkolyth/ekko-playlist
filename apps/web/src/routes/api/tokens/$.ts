import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

const API_URL = process.env.API_URL || "http://localhost:1337";

export const Route = createFileRoute("/api/tokens/$")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        // Verify session
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get Bearer token from session
        const token = session.session?.token;
        if (!token) {
          return new Response(JSON.stringify({ error: "No session token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Extract the path after /api/tokens/
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/api/tokens/")[1];

        // Forward request to Go API
        const body = await request.text();
        const apiURL = `${API_URL}/api/tokens/${pathParts}`;
        const response = await fetch(apiURL, {
          method: "PUT",
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
      DELETE: async ({ request }) => {
        // Verify session
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get Bearer token from session
        const token = session.session?.token;
        if (!token) {
          return new Response(JSON.stringify({ error: "No session token" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Extract the path after /api/tokens/
        const url = new URL(request.url);
        const pathParts = url.pathname.split("/api/tokens/")[1];

        // Forward request to Go API
        const apiURL = `${API_URL}/api/tokens/${pathParts}`;
        const response = await fetch(apiURL, {
          method: "DELETE",
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
