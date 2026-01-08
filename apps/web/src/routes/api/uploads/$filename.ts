import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

const API_URL = process.env.API_URL || "http://localhost:1337";

export const Route = createFileRoute("/api/uploads/$filename")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { filename: string } }) => {
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
        const response = await fetch(`${API_URL}/api/uploads/${params.filename}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // If the response is not ok, return the error
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(errorText, {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Get the content type from the Go API response
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const contentLength = response.headers.get("content-length");

        // Get the image data as a blob
        const blob = await response.blob();

        // Return the image with proper headers
        const headers: HeadersInit = {
          "Content-Type": contentType,
        };
        if (contentLength) {
          headers["Content-Length"] = contentLength;
        }
        // Add cache headers
        headers["Cache-Control"] = "public, max-age=31536000";

        return new Response(blob, {
          status: response.status,
          headers,
        });
      },
    },
  },
});
