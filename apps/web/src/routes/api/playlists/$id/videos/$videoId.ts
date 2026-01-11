import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

export const Route = createFileRoute("/api/playlists/$id/videos/$videoId")({
  server: {
    handlers: {
      DELETE: async ({
        request,
        params,
      }: {
        request: Request;
        params: { id: string; videoId: string };
      }) => {
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
        const response = await fetch(
          `${process.env.API_URL}/api/playlists/${params.id}/videos/${params.videoId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        const data = await response.text();
        return new Response(data, {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
