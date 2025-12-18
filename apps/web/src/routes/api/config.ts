// API endpoint to provide runtime configuration to the client
// This allows environment variables to be injected at container runtime

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Get the API URL from environment or construct it from the request
        const apiUrl =
          process.env.API_URL ||
          process.env.VITE_API_URL ||
          `${new URL(request.url).protocol}//${new URL(request.url).hostname}:1337`;

        console.log(
          "Config endpoint - process.env.API_URL:",
          process.env.API_URL,
        );
        console.log(
          "Config endpoint - process.env.VITE_API_URL:",
          process.env.VITE_API_URL,
        );
        console.log("Config endpoint - returning apiUrl:", apiUrl);

        return new Response(
          JSON.stringify({
            apiUrl,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
          },
        );
      },
    },
  },
});
