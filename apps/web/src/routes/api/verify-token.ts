import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth.server";

export const Route = createFileRoute("/api/verify-token")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const { token } = body;

          if (!token) {
            return new Response(
              JSON.stringify({ error: "Token is required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Verify the one-time token using Better Auth's verifyOneTimeToken API
          // This returns the session that was attached to the token
          console.log(
            "Verifying one-time token:",
            token.substring(0, 10) + "...",
          );

          let result;
          try {
            // Call verifyOneTimeToken through the API
            // TypeScript doesn't know about plugin methods, so we need to use 'as any' or type assertion
            const verifyMethod = (auth.api as any).verifyOneTimeToken;
            if (!verifyMethod) {
              throw new Error(
                "verifyOneTimeToken method not available - check oneTimeToken plugin is configured",
              );
            }
            result = await verifyMethod({
              body: {
                token: token,
              },
              headers: request.headers,
            });
            console.log("Verify result:", JSON.stringify(result, null, 2));
            console.log("Session structure:", {
              hasResult: !!result,
              hasSession: !!result?.session,
              sessionKeys: result?.session ? Object.keys(result.session) : [],
              hasUser: !!result?.session?.user,
              userKeys: result?.session?.user
                ? Object.keys(result.session.user)
                : [],
            });
          } catch (error) {
            console.error("Error calling verifyOneTimeToken:", error);
            return new Response(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to verify token",
                details: error instanceof Error ? error.stack : String(error),
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Check for user in different possible locations
          const user =
            result?.session?.user ||
            result?.user ||
            result?.session?.data?.user;

          if (!result || !result.session || !user) {
            console.log("Token verification failed - no session or user:", {
              hasResult: !!result,
              hasSession: !!result?.session,
              hasUser: !!user,
              sessionStructure: result?.session
                ? Object.keys(result.session)
                : [],
            });
            return new Response(
              JSON.stringify({ error: "Invalid or expired token" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          // Return the user info from the session
          return new Response(
            JSON.stringify({
              user_id: user.id,
              email: user.email,
              name: user.name,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          console.error("Error verifying token:", error);
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
