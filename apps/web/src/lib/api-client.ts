const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';
const BEARER_TOKEN_KEY = 'better_auth_bearer_token';

export interface ApiAuthResponse {
  token: string;
  user_id: number;
  email: string;
}

/**
 * Get Bearer token from Better Auth (stored after sign in)
 * This token is used for API requests to the Go API
 * The web app itself uses cookie-based sessions
 */
export function getBearerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BEARER_TOKEN_KEY);
}

/**
 * Clear the stored Bearer token
 */
export function clearBearerToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  }
}

/**
 * Make an authenticated request to the API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getBearerToken();
  
  // If no token stored, try to get it from the current session
  if (!token) {
    try {
      const { getSessionToken } = await import('@/lib/auth-client');
      token = await getSessionToken();
      if (token && typeof window !== 'undefined') {
        localStorage.setItem(BEARER_TOKEN_KEY, token);
      }
    } catch (err) {
      console.error('Error getting session token:', err);
    }
  }

  const headers = new Headers(options.headers);

  // Add Authorization header with Better Auth Bearer token
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('Sending API request with Bearer token');
  } else {
    console.warn('No Bearer token available for API request');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear invalid token
      clearBearerToken();
      throw new Error('Session expired. Please log in again.');
    }
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  return response.json();
}

