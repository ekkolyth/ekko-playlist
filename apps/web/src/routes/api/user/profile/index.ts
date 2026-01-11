import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

export const Route = createFileRoute("/api/user/profile/")({
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
        const response = await fetch(`${process.env.API_URL}/api/user/profile`, {
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

        // Check if request is multipart/form-data
        const contentType = request.headers.get("content-type") || "";
        const isMultipart = contentType.includes("multipart/form-data");

        // Prepare headers for forwarding
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };

        // Forward request to Go API
        let response: Response;
        if (isMultipart) {
          // For multipart/form-data, forward the FormData directly
          // Don't set Content-Type - fetch will set it with the correct boundary
          const formData = await request.formData();
          response = await fetch(`${process.env.API_URL}/api/user/profile`, {
            method: "PUT",
            headers,
            body: formData,
          });
        } else {
          // For JSON, forward as before
          const body = await request.text();
          headers["Content-Type"] = "application/json";
          response = await fetch(`${process.env.API_URL}/api/user/profile`, {
            method: "PUT",
            headers,
            body,
          });
        }

        const data = await response.text();
        return new Response(data, {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
