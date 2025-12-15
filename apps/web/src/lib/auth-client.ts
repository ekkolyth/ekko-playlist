import { createAuthClient } from 'better-auth/react';
import { oneTimeTokenClient } from 'better-auth/client/plugins';

const BEARER_TOKEN_KEY = 'better_auth_bearer_token';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  plugins: [oneTimeTokenClient()],
  fetchOptions: {
    onSuccess: async (ctx) => {
      // Store Bearer token from Better Auth response headers for API calls
      // The Bearer plugin sets the token in the 'set-auth-token' header
      // This is separate from the cookie-based session used for web auth
      try {
        // Try multiple header name variations
        const authToken =
          ctx.response.headers.get('set-auth-token') ||
          ctx.response.headers.get('Set-Auth-Token') ||
          ctx.response.headers.get('x-set-auth-token');

        if (authToken && typeof window !== 'undefined') {
          console.log('Bearer token captured from headers');
          localStorage.setItem(BEARER_TOKEN_KEY, authToken);
        } else {
          // If not in headers, try to get from session data after sign-in
          // The session token can be used as Bearer token
          console.log('No Bearer token in headers, will try to get from session');
        }
      } catch (err) {
        console.error('Error storing Bearer token:', err);
      }
    },
  },
});

// Helper to get session token after sign-in (as fallback if header doesn't work)
export async function getSessionToken(): Promise<string | null> {
  try {
    const session = await authClient.getSession();
    // The session token from Better Auth can be used as Bearer token
    return session.data?.session?.token || null;
  } catch (err) {
    console.error('Error getting session token:', err);
    return null;
  }
}

export const { signIn, signUp, signOut, useSession } = authClient;

// Export function to get Bearer token for API calls
export function getBearerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BEARER_TOKEN_KEY);
}
