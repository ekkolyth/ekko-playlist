const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';
const API_TOKEN_KEY = 'ekko_api_token';

export interface ApiAuthResponse {
  token: string;
  user_id: number;
  email: string;
}

/**
 * Authenticate with the Go API using email and password
 * If authentication fails, tries to register the user first, then authenticates again
 */
export async function authenticateWithApi(
  email: string,
  password: string
): Promise<ApiAuthResponse> {
  // First, try to authenticate
  let response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  // If authentication fails with 401, the user might not exist in Go API
  // Try to register them first, then authenticate again
  if (response.status === 401) {
    // Try to register (this might fail with 409 if user already exists, which is fine)
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    // If registration succeeds or user already exists (409), try to authenticate again
    if (registerResponse.ok || registerResponse.status === 409) {
      // Retry authentication
      response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
    }
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API authentication failed: ${response.status} ${errorText}`);
  }

  const data: ApiAuthResponse = await response.json();
  // Store token in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_TOKEN_KEY, data.token);
  }
  return data;
}

/**
 * Register with the Go API using email and password
 */
export async function registerWithApi(
  email: string,
  password: string
): Promise<ApiAuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API registration failed: ${response.status} ${errorText}`);
  }

  const data: ApiAuthResponse = await response.json();
  // Store token in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_TOKEN_KEY, data.token);
  }
  return data;
}

/**
 * Get the stored API token
 */
export function getApiToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(API_TOKEN_KEY);
}

/**
 * Clear the stored API token
 */
export function clearApiToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(API_TOKEN_KEY);
  }
}

/**
 * Make an authenticated request to the API
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getApiToken();
  const headers = new Headers(options.headers);

  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear invalid token
      clearApiToken();
      throw new Error('Session expired. Please log in again.');
    }
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  return response.json();
}

