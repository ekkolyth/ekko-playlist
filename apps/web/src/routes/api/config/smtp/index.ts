import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

const API_URL = process.env.API_URL || "http://localhost:1337";

export const Route = createFileRoute("/api/config/smtp/")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
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

        // Forward request to Go API
        const response = await fetch(`${API_URL}/api/config/smtp`, {
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
      PUT: async ({ request }: { request: Request }) => {
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

        // Forward request to Go API
        const body = await request.text();
        const response = await fetch(`${API_URL}/api/config/smtp`, {
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
    },
  },
});
