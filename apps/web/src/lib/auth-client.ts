import { createAuthClient } from 'better-auth/react';
import { oneTimeTokenClient } from 'better-auth/client/plugins';
import { jwtClient } from 'better-auth/client/plugins';
import { emailOTPClient } from 'better-auth/client/plugins';

const BEARER_TOKEN_KEY = 'better_auth_bearer_token';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  plugins: [jwtClient(), oneTimeTokenClient(), emailOTPClient()],
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
    onError: async (ctx) => {
      // Log errors from Better Auth API calls
      console.error('[Better Auth Client] Request failed:', {
        url: ctx.request.url,
        method: ctx.request.method,
        status: ctx.response?.status,
        statusText: ctx.response?.statusText,
        error: ctx.error,
      });
      // Re-throw the error so it propagates to the caller
      throw ctx.error || new Error(`Better Auth request failed: ${ctx.response?.status} ${ctx.response?.statusText}`);
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

/**
 * Send email verification OTP code to the specified email address
 * Uses Better Auth's emailOTP plugin
 * @param email - The email address to send the verification code to
 */
export async function sendEmailVerificationOTP(email: string) {
  // Better Auth's emailOTP plugin uses emailOtp.sendVerificationOtp() method
  // which calls /api/auth/email-otp/send-verification-otp endpoint
  return authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
}

/**
 * Verify email OTP code
 * Uses Better Auth's emailOTP plugin
 * @param email - The email address being verified
 * @param otp - The 6-digit OTP code
 */
export async function verifyEmailOTP(email: string, otp: string) {
  // Better Auth's emailOTP plugin uses emailOtp.verifyEmail() method
  // which calls /api/auth/email-otp/verify-email endpoint
  return authClient.emailOtp.verifyEmail({ email, otp });
}

// Legacy function names for backward compatibility (deprecated)
/** @deprecated Use sendEmailVerificationOTP instead */
export async function sendEmailVerification(email: string): Promise<void> {
  await sendEmailVerificationOTP(email);
}

/** @deprecated Use verifyEmailOTP instead */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  await verifyEmailOTP(email, code);
}
