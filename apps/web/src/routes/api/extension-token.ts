import { createFileRoute } from '@tanstack/react-router';
import { auth } from '@/lib/auth.server';
import { authenticateWithApi } from '@/lib/api-client';

const API_URL = process.env.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:1337';

export const Route = createFileRoute('/api/extension-token')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Get the Better Auth session from the request
          const session = await auth.api.getSession({ headers: await request.headers });

          if (!session?.user) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Get user email from session
          const email = session.user.email;
          if (!email) {
            return new Response(JSON.stringify({ error: 'User email not found' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // We need the user's password to create a Go API token
          // Since we don't have it, we'll need to get it from the request body
          const body = await request.json().catch(() => ({}));
          const password = body.password;

          if (!password) {
            return new Response(
              JSON.stringify({
                error: 'Password required to generate Go API token. Please use the Better Auth one-time token instead.',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }

          // Authenticate with Go API to get a token
          const apiResponse = await authenticateWithApi(email, password);

          return new Response(
            JSON.stringify({
              token: apiResponse.token,
              user_id: apiResponse.user_id,
              email: apiResponse.email,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        } catch (error) {
          console.error('Error generating extension token:', error);
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Internal server error',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      },
    },
  },
});

